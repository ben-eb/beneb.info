---
title: "Better ampersands & how to achieve them with unicode range"
date: 2015-02-05
tags: css,typography
template: entry.hbs
---

Recently, I discovered [this article on unicode-range](http://24ways.org/2011/creating-custom-font-stacks-with-unicode-range/)&mdash;it was definitely worth a read. While Firefox *still doesn't support this technique* (it's coming in version 36), one of the things that I found really interesting about it was that it is possible to do this sort of thing *in text*. It feels really wrong doing this:

```html
<h1>Some title <span class="amp">&amp;</span> some other stuff</h1>
```

On a blog such as this one which uses Markdown for publishing, it's much cleaner to write this:

```markdown
# Some title & some other stuff
```

That way, if the design is updated and the custom ampersands do not fit into the new look, the CSS can be removed & nothing else has to change!

Essentially the gist of the article is that you can specify a local font to use as an ampersand, then override it in Firefox. I am using this technique on this blog, but instead of using Arial as a fallback, I wanted to use the fonts that I already had in place. The code, then, is slightly more verbose:

```css
/* Load the web fonts */

@font-face {
    font-family: Oxygen;
    font-style: normal;
    font-weight: 400;
    src: url(../fonts/oxygen-webfont.woff2) format("woff2"),
         url(../fonts/oxygen-webfont.woff) format("woff");
}

@font-face {
    font-family: Bitter;
    font-style: normal;
    font-weight: 400;
    src: url(../fonts/bitter-regular-webfont.woff2) format("woff2"),
         url(../fonts/bitter-regular-webfont.woff) format("woff");
}

/* Load the ampersand override */

@font-face {
    font-family: Ampersand;
    src: local(Baskerville-italic), local(Palatino), local(Book Antiqua);
    unicode-range: U+26;
}

@font-face {
    font-family: Ampersand Headings;
    src: local(Baskerville-italic), local(Palatino), local(Book Antiqua);
    unicode-range: U+26;
}

/* Load the ampersand fallback */

@font-face {
    font-family: Ampersand;
    font-style: normal;
    font-weight: 400;
    src: url(../fonts/oxygen-webfont.woff2) format("woff2"),
         url(../fonts/oxygen-webfont.woff) format("woff");
    unicode-range: U+270C;
}

@font-face {
    font-family: Ampersand Headings;
    font-style: normal;
    font-weight: 400;
    src: url(../fonts/bitter-regular-webfont.woff2) format("woff2"),
         url(../fonts/bitter-regular-webfont.woff) format("woff");
    unicode-range:U+270C;
}

/* Apply the fonts to body copy and headings */

body {
    font-family: Ampersand, Oxygen, Helvetica Neue, Helvetica, Arial, sans-serif;
}

h1 {
    font-family: Ampersand Headings, Bitter, Georgia, Times New Roman, Times, serif;
}
```

This way means that you can have a nice custom ampersand in supported browsers, & in Firefox the ampersand will gracefully degrade back to the webfont it was already using.
