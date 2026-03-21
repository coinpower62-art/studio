export default {
  default: {
    override: {
      wrapper: "cloudflare-node",
      converter: "edge",
      incrementalCache: "async-local-storage",
      tagCache: "dummy",
    },
  },
};
