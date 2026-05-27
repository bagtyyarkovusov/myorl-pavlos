const ALLOWED_FILES = [
  "src/app/[locale]/search-results/page.tsx",
  "src/app/admin/search-analytics/page.tsx",
  "src/app/admin/web-vitals/page.tsx",
];

export default {
  meta: {
    type: "problem",
    docs: {
      description: 'Disallow `export const dynamic = "force-dynamic"` outside approved files',
    },
    messages: {
      noForceDynamic:
        '`export const dynamic = "force-dynamic"` is not allowed here. ' +
        "Use ISR + tag-based revalidation instead (export const revalidate = <seconds>). " +
        "Only [locale]/search-results and admin/search-analytics may use force-dynamic. " +
        "See ADR-014: docs/adr/ADR-014-isr-revalidation-replaces-force-dynamic.md",
    },
    schema: [],
  },

  create(context) {
    const filename = context.filename ?? context.getFilename?.() ?? "";

    if (isAllowed(filename)) {
      return {};
    }

    return {
      ExportNamedDeclaration(node) {
        const decl = node.declaration;
        if (decl?.type !== "VariableDeclaration") return;
        if (decl.kind !== "const") return;
        if (decl.declarations.length !== 1) return;

        const varDecl = decl.declarations[0];
        if (varDecl.id?.type !== "Identifier") return;
        if (varDecl.id.name !== "dynamic") return;
        if (varDecl.init?.type !== "Literal") return;
        if (varDecl.init.value !== "force-dynamic") return;

        context.report({ node, messageId: "noForceDynamic" });
      },
    };
  },
};

function isAllowed(filename) {
  return ALLOWED_FILES.some((allowed) => filename.endsWith(allowed));
}
