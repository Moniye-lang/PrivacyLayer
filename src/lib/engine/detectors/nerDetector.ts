import { CandidateDetection, Detector, DetectorContext, PriorityLevel } from '../../../types';
import { runStage2NER } from '../stage2NER';

export class NerDetector implements Detector {
  public readonly id = 'ner-detector';
  public readonly name = 'Offline NER Gazetteer Detector';
  public readonly priority = PriorityLevel.CONTEXT + 5; // 75 priority

  public async detect(text: string, context?: DetectorContext): Promise<CandidateDetection[]> {
    const nerEntities = runStage2NER(text);

    return nerEntities.map((e) => ({
      id: e.id,
      start: e.start,
      end: e.end,
      entityType: e.type,
      confidence: e.confidence,
      priority: this.priority,
      detectorId: this.id,
      evidence: e.reason,
      atomic: true,
      text: e.text,
    }));
  }
}
