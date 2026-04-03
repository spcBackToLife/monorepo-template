export class EchoDeduplicator {
  private pendingFingerprints = new Set<string>();

  markOutgoing(fingerprint: string): void {
    this.pendingFingerprints.add(fingerprint);
  }

  shouldApplyIncoming(fingerprint: string): boolean {
    if (this.pendingFingerprints.has(fingerprint)) {
      this.pendingFingerprints.delete(fingerprint);
      return false; // This is our own echo, skip it
    }
    return true; // From another client/AI, apply it
  }

  clear(): void {
    this.pendingFingerprints.clear();
  }
}
