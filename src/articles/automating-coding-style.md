---
title: "Automating coding style"
date: 2015-02-13
tags: productivity
template: entry.hbs
---

Coding style is important. So important, that people can be outright *religous*
about what some may feel is insignificant. Tabs, or spaces? 2 space indent, or
4? Do we keep the last line of a file, and what should happen to trailing spaces
should they remain in our pristine source code? Of course, there are many
opinions on the subject, but the one thing that has stuck with me is that any
such style rules should be discussed with those who are coding the product, and
then *set in stone and enforced by software*.

> Working in a well-organized code base is like cooking in a clean kitchen. If
things feel messy, it’s easy not to treat it with respect. If the formatting
feels sloppy, it will tempt you to also be sloppy when it comes to readability,
dependency management, and testing.
>
> -- [Joe Ferris][1]

I found myself agreeing with many points raised in [Why Does Style Matter?][1];
indeed, I've discovered the benefits of consistent formatting only within the
last few years. Code just looks *neater* when it is formatted consistently; if
you write it the same way every time, people who are unfamiliar with your code
won't get put off by the lack of consistency. As an example, this looks really
messy:

```js
$('#email').blur(function()
{
    var email = $(this);
    valid = validate_input(email.val(), 'email address', {
        required:true,
        email:true
    });
    if (!valid) {
        validate_message(email,'#email-check',valid);
    }
    else {
        $.getJSON("http://api.mywebsite.com/users/" + email.val() + "?callback=?", function(e) {
            if (e.email===email.val()) {
                validate_message(email,'#email-check','Your email address is already registered!');
            }
            else
            {
                validate_message(email,'#email-check','OK');
            }
        });
    }
});
```

The lack of formatting consistency doesn't aid readability, especially in this
jQuery soup. We can do a little better without having to change the logic in
the code:

```js
$('#email').blur(function () {
    var email = $(this);
    valid = validateInput(email.val(), 'email address', {
        required: true,
        email: true
    });
    if (!valid) {
        validateMessage(email, '#email-check', valid);
    } else {
        $.getJSON('http://api.website.com/users/' + email.val() + '?callback=?', function (e) {
            if (e.email === email.val()) {
                validateMessage(email, '#email-check', 'Your email address is already registered!');
            } else {
                validateMessage(email, '#email-check', 'OK');
            }
        });
    }
});
```

And it's better still if we were to change the logic around and reduce line
length:

```js
$('#email').blur(function () {
    var email = $(this);
    var endpoint = 'http://api.website.com/users/' + email.val() + '?callback=?';
    var message;
    valid = validate_input(email.val(), 'email address', {
        required: true,
        email: true
    });
    
    if (valid) {
        $.getJSON(endpoint, function (e) {
            if (e.email === email.val()) {
                message = 'Your email address is already registered!';
            } else {
                message = 'OK';
            }
        });
    } else {
        message = valid;
    }
    
    validateMessage(email, '#email-check', message);
});
```

In most cases, work like this should be done by the developer writing the code;
code review should be about finding issues with some code; whether it is a
performance or maintenance concern, not taking the developer to task about their
line lengths or repetitive code.

But to me, a service like [Hound][2] doesn't appeal, for a number of reasons.
The main one is just that its helpful suggestions come too late in the process.

## Set, and forget

Common tasks, such as removing trailing whitespace, setting line endings &
indentation size/character can be done whilst the file is being edited, using
[EditorConfig][3]. The nice thing about this is that it is really easy to set up
complex whitespace arrangements for different file types; say if you edit Ruby
code and want to stick to their 2 space indent convention, but for your SCSS you
want 4 spaces. It's easy to define an `.editorconfig` file for this purpose:

```ini
# editorconfig.org
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

# 4 space indentation just for CSS
[*.scss]
indent_size = 4
```

With EditorConfig plugins, your text editor can always respect the project's
code style decisions, & you can have different setups for each project, if you
so wish.

## More than just whitespace

But why stop at whitespace? Tools such as [ESLint][4] can check our source code
for programmatic & stylistic errors. Want all of your variable and function
names in `camelCase`? [There's an option for that][5], and many others; the
advantage of using these is that your computer is always analysing what you
write, *as you write it*; mistakes can be fixed immediately, then and there.

For the perfectionist in us, there exists [JSCS][6]; an extremely thorough code
style validator. Although it may seem a little daunting, it works best when
starting a new project from scratch; using it on your existing projects may lead
to you feeling overwhelmed.

Why wait to push your code to GitHub before a computer tells you that it could
be improved upon?

[1]: http://robots.thoughtbot.com/why-does-style-matter
[2]: https://houndci.com/
[3]: http://editorconfig.org/
[4]: http://eslint.org/
[5]: http://eslint.org/docs/rules/camelcase.html
[6]: http://jscs.info/