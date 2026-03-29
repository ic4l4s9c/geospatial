# Developing guide

## Running locally

```sh
bun i
bun run dev
```

## Testing

```sh
bun run build
bun run typecheck
bun run lint
bun run test
```

## Deploying

### Building a one-off package

```sh
bun run build
```

### Deploying a new version

```sh
bun run release
```

or for alpha release:

```sh
bun run alpha
```
