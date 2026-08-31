import { CandidateDetection, Detector, DetectorContext } from '../../../types';

export class ParallelDetectorManager {
  private detectors: Detector[] = [];

  constructor(initialDetectors: Detector[] = []) {
    this.detectors = [...initialDetectors];
  }

  public register(detector: Detector): void {
    // Avoid duplicate registration by id
    const existingIndex = this.detectors.findIndex((d) => d.id === detector.id);
    if (existingIndex >= 0) {
      this.detectors[existingIndex] = detector;
    } else {
      this.detectors.push(detector);
    }
  }

  public getRegisteredDetectors(): Detector[] {
    return [...this.detectors];
  }

  public async detectAll(text: string, context?: DetectorContext): Promise<CandidateDetection[]> {
    if (!text || text.trim().length === 0) {
      return [];
    }

    const results = await Promise.all(
      this.detectors.map(async (detector) => {
        try {
          return await detector.detect(text, context);
        } catch (err) {
          console.error(`Detector [${detector.id}] failed during execution:`, err);
          return [] as CandidateDetection[];
        }
      })
    );

    // Flatten results array
    return results.flat();
  }
}
