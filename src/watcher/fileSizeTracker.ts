export class FileSizeTracker {
  path: string;
  size: number;
  unchangedCount = 0;
  consumed = false;

  constructor(path: string, size: number) {
    this.path = path;
    this.size = size;
  }

  public updateSize = (newSize: number) => {
    if (newSize === this.size) {
      this.unchangedCount++;
    } else {
      this.unchangedCount = 0;
    }
    this.size = newSize;
  };

  public isUnchangedFor = (intervals: number) => this.unchangedCount >= intervals;

  public setConsumed = () => {
    this.consumed = true;
  };
}
