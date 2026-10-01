export function createResultState() {
  let inputRevision = 0;
  let resultRevision = null;

  return Object.freeze({
    markInputChanged() {
      inputRevision += 1;
      resultRevision = null;
    },
    markSubmitted() {
      resultRevision = inputRevision;
    },
    reset() {
      inputRevision = 0;
      resultRevision = null;
    },
    snapshot() {
      return Object.freeze({
        inputRevision,
        resultRevision,
        hasCurrentResult: resultRevision !== null && resultRevision === inputRevision,
      });
    },
  });
}
