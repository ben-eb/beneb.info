---
title: "More powerful Markdown with custom renderers"
date: 2015-02-21
tags: productivity,typography
template: entry.hbs
---

Markdown is great if you just want to put your thoughts down somewhere; its
plain text, no-nonsense approach means that it is much easier to focus on
actually *writing* an article, rather than messing around with different HTML
elements & classes. However, what if we're using a framework such as Bootstrap,
which has great blockquote styling, *but only if we structure our HTML a certain
way*?

To get the nice dash before our citation, Bootstrap requires that we place it in
a `<footer>` tag, which is fine, but Markdown doesn't offer this capability for
us. It does allow us to write HTML inline instead, but that isn't very portable;
what if we migrate to another framework that doesn't use this HTML? Well, we end
up having this HTML forever in our Markdown files.

That doesn't sound very appealing. So, what we'll do instead is use [cheerio][2]
and write a custom renderer for [marked][3] to automate the process for us; all
we have to do from now on is write blockquotes in Markdown format, and it will
be converted into our custom HTML automatically.

> I couldn't tell you in any detail how my computer works. I use it with a layer
> of automation.
>
> --[Conrad Wolfram][1]

In Markdown, this quote would look like the following:

```markdown
> I couldn't tell you in any detail how my computer works. I use it with a layer
> of automation.
>
> --[Conrad Wolfram][1]
```

We want to generate the following output:

```html
<blockquote>
    <p>I couldn't tell you in any detail how my computer works. I use it with a
    layer of automation.</p>
    <footer>
        <a href="http://www.wired.co.uk/news/archive/2012-06/28/conrad-wolfram-computation">Conrad Wolfram</a>
    </footer>
</blockquote>
```

In my case, I'm using [metalsmith][4] to transform the Markdown into HTML, but
the renderer logic will be the same as for any other set up. Here's the code
for that:

```js
var cheerio  = require('cheerio');
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
```

Here, we load the HTML into the cheerio parser, and then check each paragraph
inside which starts with `--`. We then wrap that paragraph with the `<footer>`
tag, and strip away the double dashes (which are replaced by a dash in the CSS).

All we have to do now is pass that renderer to [metalsmith-markdown][5]:

```js
var Metalsmith = require('metalsmith');
var markdown   = require('metalsmith-markdown');

Metalsmith(__dirname)
    // ...
    .use(markdown({ renderer: renderer }))
    // ...
    .build(function (err) {
        if (err) {
            throw err;
        }
    });
```

We now have automatic `<footer>` generation for blockquotes, site-wide; and if
the CSS framework is changed to one that does not require this tag, it is as
easy to remove.

Check out the full [build process for my blog][6], which uses this technique.

[1]: http://www.wired.co.uk/news/archive/2012-06/28/conrad-wolfram-computation
[2]: https://github.com/cheeriojs/cheerio
[3]: https://github.com/chjj/marked
[4]: http://www.metalsmith.io/
[5]: https://github.com/segmentio/metalsmith-markdown
[6]: https://github.com/ben-eb/beneb.info/blob/master/gulpfile.js
