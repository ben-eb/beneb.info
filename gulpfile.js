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
    drafts       = require('metalsmith-drafts'),
    ecstatic     = require('ecstatic'),
    excerpts     = require('metalsmith-excerpts'),
    feed         = require('metalsmith-feed'),
    gulp         = require('gulp'),
    Handlebars   = require('handlebars'),
    htmlmin      = require('metalsmith-html-minifier'),
    http         = require('http'),
    inplace      = require('metalsmith-in-place'),
    isURL        = require('is-absolute-url'),
    markdown     = require('metalsmith-markdown'),
    metalsmith   = require('metalsmith'),
    minimist     = require('minimist'),
    moment       = require('moment'),
    nano         = require('gulp-cssnano'),
    permalinks   = require('metalsmith-permalinks'),
    runSequence  = require('run-sequence'),
    sass         = require('gulp-ruby-sass'),
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

renderer.code = function (code, lang) {
    return '<pre><code class="lang-' + lang + '">' +
            require('highlight.js').highlightAuto(code).value +
        '</code></pre>';
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
    };
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
 * Handlebars helpers
 */

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
    return new Handlebars.SafeString('<a href="' + (isURL(href) ? href : '/' + href) + '" title="Permanent link to \'' + title + '\'" class="label label-title">permalink</a>');
    //return createAnchor(href, '#', 'Permanent link to \'' + title + '\'');
});

Handlebars.registerHelper('continue_reading', function (href, title) {
    return createAnchor(href, 'Continue reading...', 'Permanent link to \'' + title + '\'');
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
    gulp.watch(['./src/**/*', './partials/**/*.hbs', './templates/**/*.hbs'], ['metalsmith']);
});

gulp.task('uncss', function () {
    return gulp.src('./build/css/main.css')
        .pipe(uncss({
            html: ['./build/**/*.html']
        }))
        .pipe(nano())
        .pipe(gulp.dest('./build/css'));
});

gulp.task('metalsmith', function (cb) {
    metalsmith(__dirname)
    .metadata({
        isDev: !settings.production,
        site: {
            title: 'Ben Briggs',
            url: 'http://beneb.info',
            author: 'Ben Briggs'
        }
    })
    .use(inplace({
        engine: 'handlebars',
        partials: 'partials'
    }))
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
    .use(markdown({renderer: renderer}))
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
    .use(widow({
        selectors: 'h1 a,h2 a,article h2,h3 a, article h3,h4,h5,h6,p,li,blockquote,th,td,dt,dd'.split(',')
    }))
    .build(function (err) {
        if (err) {
            throw err;
        }
        cb();
    });
});

gulp.task('styles', function () {
    return sass(res('mainCSS'), {
        loadPath: './vendor/bootstrap-sass-official/assets/stylesheets'
    })
        .on('error', console.warn.bind(console, chalk.red('Sass Error\n')))
        .pipe(autoprefixer())
        .pipe(combinemq())
        .pipe(nano())
        .pipe(gulp.dest(res('root') + '/css'));
});

gulp.task('compile', function (callback) {
    runSequence('metalsmith', 'styles', 'uncss', callback);
});
