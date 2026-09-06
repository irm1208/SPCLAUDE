export function escapesStandaloneRoot(pathFromRoot) {
  return /^\.\.(?:[\\/]|$)/.test(pathFromRoot);
}