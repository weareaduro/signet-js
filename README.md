# @weareaduro/signet

Protocol client for [Signet](https://github.com/weareaduro/signet). It speaks the resource API and has no React dependency, so products that are not Fluent apps can use it directly.

Fluent apps should keep importing `@weareaduro/fluent-shared` for the shell, onboarding, and directory context. That package re-exports this client from `@weareaduro/fluent-shared/signet`.
