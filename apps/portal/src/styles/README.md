# Admin styling structure

The portal uses Tailwind CSS utilities and locally owned React components.

- `theme.css` contains the NetBite design tokens.
- `base.css` contains document defaults, form-control defaults, focus treatment, and reduced-motion behavior.
- Page and component layouts belong in TSX files as Tailwind utilities.
- Runtime topology coordinates use inline styles because they are calculated from instructor input.

Do not add feature-level stylesheets or restore removed semantic classes. Repeated patterns belong in `components/ui` or `components/layout`.
