'use strict';

/**
 * npm dependencies
 */

var autoprefixer = require('gulp-autoprefixer'),
    branch       = require('metalsmith-branch'),
    chalk        = require('chalk'),
    cheerio      = require('cheerio'),
    collections  = require('metalsmith-collections'),
    combinemq    = require('gulp-combine-mq'),
    cssc         = require('gulp-css-condense'),
    csso         = require('gulp-csso'),
    drafts       = require('metalsmith-drafts'),
    ecstatic     = require('ecstatic'),
    excerpts     = require('metalsmith-excerpts'),
    feed         = require('metalsmith-feed'),
    fs           = require('fs'),
    glob         = require('glob').sync,
    gulp         = require('gulp'),
    Handlebars   = require('handlebars'),
    highlight    = require('metalsmith-code-highlight'),
    htmlmin      = require('metalsmith-html-minifier'),
    http         = require('http'),
    isURL        = require('is-absolute-url'),
    lazypipe     = require('lazypipe'),
    markdown     = require('metalsmith-markdown'),
    Metalsmith   = require('metalsmith'),
    minimist     = require('minimist'),
    moment       = require('moment'),
    more         = require('gulp-more-css'),
    path         = require('path'),
    permalinks   = require('metalsmith-permalinks'),
    sass         = require('gulp-ruby-sass'),
    shrink       = require('gulp-cssshrink'),
    tags         = require('metalsmith-tags'),
    templates    = require('metalsmith-templates'),
    uncss        = require('gulp-uncss'),
    widow        = require('metalsmith-widow'),
    wordcount    = require('metalsmith-word-count');

/* ---------------------------------------------------------------- */

var renderer = new (require('marked')).Renderer();

renderer.blockquote = function (text) {
    var $ = cheerio.load('' + text);
    $('p').each(function () {
        if ($(this).text().indexOf('--') === 0) {
            var html = $(this).html().replace('--', '');
            $(this).replaceWith($('<footer>' + html + '</footer>'));
        }
    });
    return '<blockquote>' + $.html() + '</blockquote>';
};

/**
 * Get common asset paths
 */

var res = (function () {
    var resources = {
        mainCSS   : 'styles',
        bundleCSS : 'main.css',
        root      : 'build'
    };

    return function (r) {
        return './' + resources[r];
    }
})();

/**
 * Ensure that we only rebuild the output directory
 * if the --production flag is sent
 */

var settings = minimist(process.argv.slice(2), {
    boolean: 'production',
    default: { production: false }
});

/**
 * Handlebars partial registering/helper code
 */

glob(__dirname + '/templates/partials/**/*.hbs').forEach(function (partial) {
    Handlebars.registerPartial(path.basename(partial, '.hbs'), fs.readFileSync(partial, 'utf-8'));
});

function createAnchor (href, text, title) {
    if (typeof title !== 'string' && !isURL(href)) {
        title = 'Permanent link to \'' + text + '\'';
    }
    if (title) {
        title = ' title="' + title + '"';
    } else {
        title = '';
    }
    return new Handlebars.SafeString('<a href="' + (isURL(href) ? href : '/' + href) + '"' + title + '>' + text + '</a>');
}

Handlebars.registerHelper('is_current_section', function (href, url) {
    return (href && href.indexOf(url) === 0) ? new Handlebars.SafeString(' class="active"') : '';
});

Handlebars.registerHelper('link_to', function (href, title) {
    if (typeof title !== 'string') {
        title = href.charAt(0).toUpperCase() + href.slice(1);
    }
    return createAnchor(href, title);
});

Handlebars.registerHelper('link_to_permalink', function (href, title) {
    return createAnchor(href, '#', 'Permanent link to \'' + title + '\'');
});

Handlebars.registerHelper('link_to_topic', function (topic) {
    return new Handlebars.SafeString('<a href="/topics/' + topic + '" class="label label-default" title="Browse entries tagged with \'' + topic + '\'">' + topic + '</a>');
});

Handlebars.registerHelper('ifDaySame', function (date1, date2, options) {
    if (moment(date1).isSame(moment(date2), 'day')) {
        return options.fn(this);
    }
    return options.inverse(this);
});

Handlebars.registerHelper('format_date', function (date) {
    return new Handlebars.SafeString(moment(date).format('dddd, MMMM Do YYYY, [at] HH:mm'));
});

Handlebars.registerHelper('format_date_only', function (date) {
    return new Handlebars.SafeString(moment(date).format('dddd, MMMM Do YYYY'));
});

Handlebars.registerHelper('copyright_year', function () {
    return new Handlebars.SafeString(moment().format('YYYY'));
});

/**
 * CSS Optimisation pipeline; just run all the minifiers!
 */

var cssOptim = lazypipe()
    //.pipe(csso)
    .pipe(cssc)
    //.pipe(shrink)
    //.pipe(more);

/**
 * Define our gulp tasks.
 * - watch: watch all files for changes, run the build directory in a static server
 * - uncss: not recommended usage during development, can be a slow task
 * - metalsmith: builds our static site
 * - styles: if we just need to update the css files
 * - compile: run all of the tasks through once
 */

gulp.task('watch', function () {
    http.createServer(
        ecstatic({ root: __dirname + '/build' })
    ).listen(8082);

    gulp.watch(res('mainCSS') + '/**/*.scss', ['styles']);
    gulp.watch(['./src/**/*', './templates/**/*.hbs'], ['metalsmith']);
});

gulp.task('uncss', function () {
    return gulp.src('./build/css/main.css')
        .pipe(uncss({
            html: ['./build/**/*.html']
        }))
        .pipe(cssOptim())
        .pipe(gulp.dest('./build/css'));
});

gulp.task('metalsmith', function (cb) {
    Metalsmith(__dirname)
    .metadata({
        isDev: !settings.production,
        site: {
            title: 'Ben Briggs',
            url: 'http://beneb.info',
            author: 'Ben Briggs'
        }
    })
    .clean(settings.production)
    .use(drafts())
    .use(collections({
        articles: {
            pattern: 'articles/**/*',
            sortBy: 'date',
            reverse: true
        },
        pages: {
            pattern: 'pages/**/*'
        },
        topics: {
            pattern: 'topics/**/*'
        }
    }))
    .use(markdown({ renderer: renderer }))
    .use(highlight({
        scoped: 'pre code'
    }))
    .use(wordcount())
    .use(tags({
        handle: 'tags',
        path: 'topics',
        template: 'tags.hbs',
        sortBy: 'date',
        reverse: true
    }))
    .use(branch('articles/**/*')
        .use(permalinks({
            pattern: ':date/:title',
            relative: true,
            date: 'YYYY/MM'
        }))
    )
    .use(branch('topics/**/*')
        .use(permalinks({
            pattern: ':collection/:title',
            relative: true
        }))
    )
    .use(branch('pages/**/*')
        .use(permalinks({
            pattern: ':title'
        }))
    )
    .use(feed({ collection: 'articles' }))
    .use(excerpts())
    .use(templates('handlebars'))
    .use(htmlmin())
    .use(widow())
    .build(cb);
});

gulp.task('styles', function () {
    return sass(res('mainCSS'), {
        loadPath: './vendor/bootstrap-sass-official/assets/stylesheets'
    })
        .on('error', console.warn.bind(console, chalk.red('Sass Error\n')))
        .pipe(autoprefixer())
        .pipe(combinemq())
        .pipe(cssOptim())
        .pipe(gulp.dest(res('root') + '/css'));
});

gulp.task('compile', ['metalsmith', 'styles', 'uncss']);
