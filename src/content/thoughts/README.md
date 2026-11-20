# Thoughts

One post per `.mdx` file in this folder. The file name is the address: `first-light.mdx` is `/thoughts/first-light/`.

```mdx
---
title: The title (required)
date: 2026-11-18
summary: One line for the list and the feed (optional)
---

The post, in Markdown and MDX.
```

A post with no title or no date fails the build. This README is not a post: only `.mdx` files are.

Each post also gets a plain Markdown copy beside its page, built from the same file: `first-light.mdx` is also `/thoughts/first-light.md`. It holds the title, the date and the text. Imports, exports, `{expressions}` and component tags are left out, and the words inside a component stay.
