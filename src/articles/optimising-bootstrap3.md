---
title: "Taming the Beast: Optimising Bootstrap 3"
date: 2015-01-22
tags: gulpjs,css,optimisation,minify
template: entry.hbs
---

One of the great things about [Bootstrap](http://getbootstrap.com) is that it offers a strong foundation on which to build a website or web application. The documentation is extensive, it offers many components for common use cases, and it lends itself to rapid development. However, when deploying to production, it can seem less appealing. CSS files produced by Bootstrap tend to be over 100KB, and that's *before* you start adding your own custom rules. Especially when developing a small website, it is unlikely that you'll need all of the elements that it has to offer.

In this post we'll look at what measures we can take to reduce Bootstrap 3 down to only its necessary elements. Your mileage may vary, depending on how much of the framework you use; and to get the most out of Bootstrap you should be using a CSS preprocessor. Bootstrap is written in Less but there is also a [Sass port][sassPort], which I will be referencing in this article. Also note that some of these techniques are equally applicable to other CSS frameworks.

## Put down pre-packaged builds. Hello Sass.

One of the first things we need to start with is customising our own version of Bootstrap 3. To get the most out of our stylesheets, we shouldn't be using pre-packaged builds that third parties provide to us as a convenience; they encourage us to put their CDN links first and then override the styling with our own rules. Unfortunately this means that we miss out on one of the best features of Bootstrap; its *customisability*.

However, this does not mean that we should all jump on over to [the customise page for Bootstrap](http://getbootstrap.com/customize/), with its myriad options. The likelihood is that all of the hex colours/font sizes that you input there will be consistent with other, custom components that you write yourself. Therefore, you should be defining them in your Sass files instead, making them reusable and easily modifiable.

The first step is to [install the Sass version of Bootstrap][sassPort]. With [Bower](http://bower.io), we can simply do:

```sh
$ bower install bootstrap-sass-official
```

Next, we need to load it into our Sass files. But hold on; we need to start writing a *build process* which will end up handling all of our compilation and optimisation tasks, and ensure that we have a customised build of Bootstrap for our production site. For tasks such as these, [gulp](http://gulpjs.com) suits the job perfectly as a sequence of transformations can be applied to our CSS in memory. Once you have installed gulp globally, then install the other dependencies from npm:

```sh
$ npm install gulp gulp-ruby-sass@1.0.0-alpha chalk --save-dev
```

Our first iteration of our Sass task should just take the source files from the `styles` directory, compile them into CSS and then write them to a destination. In addition, if there were any errors, log them to the console:

```js
var chalk = require('chalk'),
    gulp  = require('gulp'),
    sass  = require('gulp-ruby-sass');

gulp.task('styles', function () {
    return sass('./styles', {
        loadPath: './vendor/bootstrap-sass/assets/stylesheets'
    }).on('error', console.warn.bind(console, chalk.red('Sass Error\n')))
        .pipe(gulp.dest('./build/css'));
});
```

We define a `loadPath` here so that we can import Bootstrap into our stylesheets. So, in the `./styles` directory, create a new file called `main.scss` and write:

```scss
@import 'bootstrap';
```

Now, when we run `gulp styles`, we will have the full Bootstrap 3 source code in the `./build/css` directory. We are ready to start optimising.

## Method 1: Include only necessary components

The simplest way to trim down the framework is just simply to customise which `@import` statements that you carry over into your main CSS file. You can do this by changing the contents of `main.scss` to something like this:

```scss
// Core variables and mixins
@import "bootstrap/variables";
@import "bootstrap/mixins";

// Reset and dependencies
@import "bootstrap/normalize";
@import "bootstrap/print";
@import "bootstrap/glyphicons";

// Core CSS
@import "bootstrap/scaffolding";
@import "bootstrap/type";
@import "bootstrap/code";
@import "bootstrap/grid";
@import "bootstrap/tables";
@import "bootstrap/forms";
@import "bootstrap/buttons";

// Components
@import "bootstrap/component-animations";
@import "bootstrap/dropdowns";
@import "bootstrap/button-groups";
@import "bootstrap/input-groups";
@import "bootstrap/navs";
@import "bootstrap/navbar";
@import "bootstrap/breadcrumbs";
@import "bootstrap/pagination";
@import "bootstrap/pager";
@import "bootstrap/labels";
@import "bootstrap/badges";
@import "bootstrap/jumbotron";
@import "bootstrap/thumbnails";
@import "bootstrap/alerts";
@import "bootstrap/progress-bars";
@import "bootstrap/media";
@import "bootstrap/list-group";
@import "bootstrap/panels";
@import "bootstrap/responsive-embed";
@import "bootstrap/wells";
@import "bootstrap/close";

// Components w/ JavaScript
@import "bootstrap/modals";
@import "bootstrap/tooltip";
@import "bootstrap/popovers";
@import "bootstrap/carousel";

// Utility classes
@import "bootstrap/utilities";
@import "bootstrap/responsive-utilities";
```

Lets say that you aren't going to use the JS components in your application. Well, just simply delete the relevant `@import` statements, and already your build is looking smaller. But, six months later on, you may want to add some of these back in to your build, as your requirements may change, so this approach may not scale well.

## Method 2: Use UnCSS to determine which classes are being used

A more scalable version of the above is to use UnCSS, a tool that find unused CSS rules by analysing them against the HTML of your website. I wrote a [gulp plugin for UnCSS][gulpUnCSS] which allows us to do the same thing in our build:

```sh
$ npm install glob gulp-uncss --save-dev
```

Depending on the size of your site, it probably won't be feasible to run this tool whilst you are developing. Instead, have a separate UnCSS task that you can run before deploying to production, like so:

```js
var glob  = require('glob').sync,
    uncss = require('gulp-uncss');

gulp.task('uncss', function () {
    return gulp.src('./build/css/main.css')
        .pipe(uncss({
            html: glob('./build/**/*.html')
        }))
        .pipe(gulp.dest('./build/css'));
});
```

Note that UnCSS does not detect classes that are added by user interaction, so if you are to use any JavaScript components from the framework then [you must pass an `ignore` list][gulpUnCSS] to UnCSS. Even so, especially on small sites, UnCSS makes a huge difference to the size of the output file.

## Method 3: Use combine-mq to eliminate duplication of media queries

Because of Bootstrap's expansive size, its CSS rules must be grouped together into logical components; this is also true of the media query selectors that it uses. There are many media query breakpoints that are repeated over and over, adding weight to the CSS file. To optimise this, we can use [gulp-combine-mq][gulpCombineMQ], which will remove duplicates.

```sh
$ npm install gulp-combine-mq --save-dev
```

We'll add this to our default styles task:

```js
var combinemq = require('gulp-combine-mq');

gulp.task('styles', function () {
    return sass('./styles', {
        loadPath: './vendor/bootstrap-sass/assets/stylesheets'
    }).on('error', console.warn.bind(console, chalk.red('Sass Error\n')))
        .pipe(combinemq())
        .pipe(gulp.dest('./build/css'));
});
```

## Method 4: Use autoprefixer to include only necessary vendor prefixes

Autoprefixer is a tool that adds vendor prefixes to unprefixed CSS properties, and is based on the excellent [Can I use...][canIuse] database. This means that we only have to include prefixes for browsers that still need them, and redundant properties are dropped from the resulting stylesheet. So, in a few years time, when Browser X supports a feature unprefixed and usage of the older versions declines to a less than relevant installed percentage, Autoprefixer will know to not supply the prefix for that browser. It also means that when authoring your SCSS, you don't need to write the vendor prefixes yourself. It's an easy win.

```sh
$ npm install gulp-autoprefixer --save-dev
```

Again, add this to the default styles task:

```js
var autoprefixer = require('gulp-autoprefixer');

gulp.task('styles', function () {
    return sass('./styles', {
        loadPath: './vendor/bootstrap-sass/assets/stylesheets'
    }).on('error', console.warn.bind(console, chalk.red('Sass Error\n')))
        .pipe(autoprefixer())
        .pipe(combinemq())
        .pipe(gulp.dest('./build/css'));
});
```

## Method 5: Use variables for customising, rather than writing more selectors

Let us return to customisability. Writing more selectors for Bootstrap to define things like a different button colour, or a different form control style can lead to bloat. Instead, before we do any of that, we should customise the base framework and only include our own custom components when necessary. At this point, I like to extract the variables part of `main.scss` out into its own file - so that `main.scss` now looks like this:

```scss
@import "variables";

// Reset and dependencies
@import "bootstrap/normalize";
@import "bootstrap/print";
@import "bootstrap/glyphicons";

// ... etc
```

And then, we can have a `_variables.scss` file in which variables are defined:

```scss
$body-bg: #000;
$text-color: #fff;

// Core variables and mixins
@import "bootstrap/variables";
@import "bootstrap/mixins";
```

This code customises Bootstrap with a black background and white text, without us having to write another selector. For simple customisations like this, have a look in your copy of [Bootstrap Sass][sassPort] for the `_variables.scss` file. In here you will find all of the variables so that you can change the appearance of Bootstrap to your liking.

## Method 6: Get a *good* minifier

There exist a plethora of CSS minification tools for JavaScript. In my opinion, the best ones offer selector and declaration consolidation; such that CSS like this:

```css
body {
    color: red;
}

body {
    background: #fff;
}
```

Will be minified to this:

```css
body{color:red;background:#fff}
```

This is useful when you are using a framework; what happens if you need to add a property to an element/class that already exists in Bootstrap, but can't edit the Sass file for obvious future compatibility reasons? Well, you can let a minifier do the work for you. [gulp-css-condense][gulpCSSC] uses these techniques to minimise your CSS structure. Other good minifiers include [gulp-csso][gulpCSSO], [gulp-more-css][gulpMoreCSS] and [gulp-cssshrink][gulpCSSShrink].

I've found that because each of these compressors offer different functionality, it's possible to extract the most compression out of your CSS by using multiple compressors. We can do that easily in gulp:

```sh
$ npm install gulp-css-condense gulp-csso gulp-more-css gulp-cssshrink --save-dev
```

```js
var cssc   = require('gulp-css-condense'),
    csso   = require('gulp-csso'),
    more   = require('gulp-more-css'),
    shrink = require('gulp-cssshrink');

gulp.task('styles', function () {
    return sass('./styles', {
        loadPath: './vendor/bootstrap-sass/assets/stylesheets'
    }).on('error', console.warn.bind(console, chalk.red('Sass Error\n')))
        .pipe(autoprefixer())
        .pipe(combinemq())
        .pipe(cssc())
        .pipe(csso())
        .pipe(more())
        .pipe(shrink())
        .pipe(gulp.dest('./build/css'));
});
```

Now, when we run the `styles` task, we will get a autoprefixed, media query combined, aggressively optimised CSS file. Great!

## Extracting compression methods with lazypipe

We're not quite done here. You will notice that our UnCSS task does not run any of the minification tasks - because it isn't a minifier itself the output looks closer to the Sass as we started writing it, although the overall size is smaller. But wait, before you start copying and pasting the `pipe()` chain from the `styles` task, you can use [lazypipe][lazypipe]!

```sh
$ npm install lazypipe --save-dev
```

Using lazypipe allows us to create an immutable stream 'factory'. Basically it means we are creating a pipeline that we can hook into in our various gulp tasks. We can use it like so:

```js
var cssOptim = lazypipe()
    .pipe(cssc)
    .pipe(csso)
    .pipe(more)
    .pipe(shrink);

gulp.task('styles', function () {
    return sass('./styles', {
        loadPath: './vendor/bootstrap-sass/assets/stylesheets'
    }).on('error', console.warn.bind(console, chalk.red('Sass Error\n')))
        .pipe(autoprefixer())
        .pipe(combinemq())
        .pipe(cssOptim())
        .pipe(gulp.dest('./build/css'));
});
```

Note that we don't call the `cssOptim` function until we need it in our `styles` task. We can now reuse that pipeline for any other tasks that might want to process CSS, such as UnCSS. So our final gulpfile should look like this:

```js
var autoprefixer = require('gulp-autoprefixer'),
    chalk        = require('chalk'),
    combinemq    = require('gulp-combine-mq'),
    cssc         = require('gulp-css-condense'),
    csso         = require('gulp-csso'),
    lazypipe     = require('lazypipe'),
    more         = require('gulp-more-css'),
    gulp         = require('gulp'),
    sass         = require('gulp-ruby-sass'),
    shrink       = require('gulp-cssshrink');

var cssOptim = lazypipe()
    .pipe(cssc)
    .pipe(csso)
    .pipe(more)
    .pipe(shrink);

gulp.task('styles', function () {
    return sass('./styles', {
        loadPath: './vendor/bootstrap-sass/assets/stylesheets'
    }).on('error', console.warn.bind(console, chalk.red('Sass Error\n')))
        .pipe(autoprefixer())
        .pipe(combinemq())
        .pipe(cssOptim())
        .pipe(gulp.dest('./build/css'));
});

gulp.task('uncss', function () {
    return gulp.src('./build/css/main.css')
        .pipe(uncss({
            html: glob('./build/**/*.html')
        }))
        .pipe(cssOptim())
        .pipe(gulp.dest('./build/css'));
});
```

## Putting it into practice

Why blog about this kind of optimisation if its not something that you're going to use? So, behold! This blog is using all of the techniques covered in the article; pay attention to the CSS source code and you'll notice that there are many familiar styles in there to describe columns, and header navigation; but many of the helper classes and columns/components that are unused have been stripped away, leaving only what the blog needs.

In closing, remember that although this article is focused on Bootstrap, these techniques can (and should!) be applied to CSS whereever it may be used. The amount of tooling that we can use to perfect our stylesheets should be taken advantage of, as every optimisation means a faster, better website experience for you and your users.

[canIuse]: http://caniuse.com/
[sassPort]: https://github.com/twbs/bootstrap-sass
[gulpCombineMQ]: https://github.com/frontendfriends/gulp-combine-mq
[gulpCSSC]: https://github.com/ben-eb/gulp-css-condense
[gulpUnCSS]: https://github.com/ben-eb/gulp-uncss
[gulpCSSO]: https://github.com/ben-eb/gulp-csso
[gulpMoreCSS]: https://github.com/ben-eb/gulp-more-css
[gulpCSSShrink]: https://github.com/stoyan/cssshrink
[lazypipe]: https://github.com/OverZealous/lazypipe
