/**
 * Alert Manager Service
 * Manages alert lifecycle and state transitions
 */

import {
  SuspiciousActivity,
  AlertState,
  ActivityType,
  Point,
  ActivityEvent
} from '../types/activity';
import { CollisionAlert } from '../types/collision';

export class AlertManager {
  private activities: Map<string, SuspiciousActivity> = new Map();
  private alertHistory: Map<string, ActivityEvent[]> = new Map();

  /**
   * Create a new suspicious activity alert
   */
  public createActivity(
    type: ActivityType,
    vessels: string[],
    location: Point,
    evidence: {
      description: string;
      metrics: Record<string, number>;
      timeline: ActivityEvent[];
    },
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): SuspiciousActivity {
    const activity: SuspiciousActivity = {
      id: this.generateActivityId(type, vessels),
      type,
      severity,
      vessels,
      detectedAt: new Date(),
      location,
      evidence,
      state: AlertState.NEW,
      notes: []
    };

    this.activities.set(activity.id, activity);
    this.addToHistory(activity.id, {
      timestamp: new Date(),
      type: 'created',
      description: `Activity detected: ${evidence.description}`
    });

    return activity;
  }

  /**
   * Convert collision alert to suspicious activity
   */
  public createActivityFromCollision(alert: CollisionAlert): SuspiciousActivity {
    const metrics: Record<string, number> = {
      distance: alert.proximity.distance,
      cpa: alert.proximity.cpa || 0,
      tcpa: alert.proximity.tcpa || 0,
      bearing: alert.proximity.bearing || 0,
      relativeSpeed: alert.proximity.relativeSpeed || 0
    };

    const timeline: ActivityEvent[] = [
      {
        timestamp: alert.timestamp,
        type: 'detection',
        description: 'Collision risk detected',
        data: { proximity: alert.proximity }
      }
    ];

    const severity = this.mapAlertLevelToSeverity(alert.level);

    return this.createActivity(
      ActivityType.COLLISION_RISK,
      [alert.vessels[0], alert.vessels[1]],
      alert.predictedCollisionPoint || { latitude: 0, longitude: 0 },
      {
        description: `Collision risk between vessels ${alert.vessels[0]} and ${alert.vessels[1]}`,
        metrics,
        timeline
      },
      severity
    );
  }

  /**
   * Acknowledge an alert
   */
  public acknowledgeActivity(activityId: string, userId: string): boolean {
    const activity = this.activities.get(activityId);
    if (!activity) return false;

    if (activity.state !== AlertState.NEW) {
      return false; // Can only acknowledge new alerts
    }

    activity.state = AlertState.ACKNOWLEDGED;
    activity.acknowledgedAt = new Date();
    activity.acknowledgedBy = userId;

    this.addToHistory(activityId, {
      timestamp: new Date(),
      type: 'acknowledged',
      description: `Alert acknowledged by ${userId}`
    });

    return true;
  }

  /**
   * Start investigation on an alert
   */
  public startInvestigation(activityId: string, userId: string): boolean {
    const activity = this.activities.get(activityId);
    if (!activity) return false;

    if (activity.state !== AlertState.NEW && activity.state !== AlertState.ACKNOWLEDGED) {
      return false;
    }

    activity.state = AlertState.INVESTIGATING;
    activity.assignedTo = userId;

    this.addToHistory(activityId, {
      timestamp: new Date(),
      type: 'investigation_started',
      description: `Investigation started by ${userId}`
    });

    return true;
  }

  /**
   * Resolve an alert
   */
  public resolveActivity(
    activityId: string,
    userId: string,
    resolution: string
  ): boolean {
    const activity = this.activities.get(activityId);
    if (!activity) return false;

    activity.state = AlertState.RESOLVED;
    activity.resolvedAt = new Date();
    activity.resolvedBy = userId;
    activity.notes.push(`Resolution: ${resolution}`);

    this.addToHistory(activityId, {
      timestamp: new Date(),
      type: 'resolved',
      description: resolution
    });

    return true;
  }

  /**
   * Mark alert as false positive
   */
  public markFalsePositive(
    activityId: string,
    userId: string,
    reason: string
  ): boolean {
    const activity = this.activities.get(activityId);
    if (!activity) return false;

    activity.state = AlertState.FALSE_POSITIVE;
    activity.resolvedAt = new Date();
    activity.resolvedBy = userId;
    activity.notes.push(`False positive: ${reason}`);

    this.addToHistory(activityId, {
      timestamp: new Date(),
      type: 'false_positive',
      description: reason
    });

    return true;
  }

  /**
   * Escalate an alert
   */
  public escalateActivity(
    activityId: string,
    userId: string,
    escalateTo: string,
    reason: string
  ): boolean {
    const activity = this.activities.get(activityId);
    if (!activity) return false;

    activity.state = AlertState.ESCALATED;
    activity.escalatedAt = new Date();
    activity.escalatedTo = escalateTo;
    activity.notes.push(`Escalated to ${escalateTo}: ${reason}`);

    this.addToHistory(activityId, {
      timestamp: new Date(),
      type: 'escalated',
      description: `Escalated to ${escalateTo}: ${reason}`
    });

    return true;
  }

  /**
   * Add a note to an activity
   */
  public addNote(activityId: string, note: string, userId: string): boolean {
    const activity = this.activities.get(activityId);
    if (!activity) return false;

    const timestamp = new Date().toISOString();
    activity.notes.push(`[${timestamp}] ${userId}: ${note}`);

    this.addToHistory(activityId, {
      timestamp: new Date(),
      type: 'note_added',
      description: note,
      data: { userId }
    });

    return true;
  }

  /**
   * Get activity by ID
   */
  public getActivity(activityId: string): SuspiciousActivity | null {
    return this.activities.get(activityId) || null;
  }

  /**
   * Get all activities
   */
  public getAllActivities(): SuspiciousActivity[] {
    return Array.from(this.activities.values());
  }

  /**
   * Get activities by state
   */
  public getActivitiesByState(state: AlertState): SuspiciousActivity[] {
    return Array.from(this.activities.values()).filter(
      activity => activity.state === state
    );
  }

  /**
   * Get activities by type
   */
  public getActivitiesByType(type: ActivityType): SuspiciousActivity[] {
    return Array.from(this.activities.values()).filter(
      activity => activity.type === type
    );
  }

  /**
   * Get activities by severity
   */
  public getActivitiesBySeverity(
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): SuspiciousActivity[] {
    return Array.from(this.activities.values()).filter(
      activity => activity.severity === severity
    );
  }

  /**
   * Get activity history
   */
  public getActivityHistory(activityId: string): ActivityEvent[] {
    return this.alertHistory.get(activityId) || [];
  }

  /**
   * Get pending activities (NEW or ACKNOWLEDGED)
   */
  public getPendingActivities(): SuspiciousActivity[] {
    return Array.from(this.activities.values()).filter(
      activity =>
        activity.state === AlertState.NEW ||
        activity.state === AlertState.ACKNOWLEDGED
    );
  }

  /**
   * Get statistics
   */
  public getStatistics() {
    const all = this.getAllActivities();
    const byState: Record<string, number> = {};
    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    for (const activity of all) {
      byState[activity.state] = (byState[activity.state] || 0) + 1;
      byType[activity.type] = (byType[activity.type] || 0) + 1;
      bySeverity[activity.severity] = (bySeverity[activity.severity] || 0) + 1;
    }

    return {
      total: all.length,
      pending: this.getPendingActivities().length,
      byState,
      byType,
      bySeverity,
      lastUpdate: new Date()
    };
  }

  /**
   * Clean up old resolved activities
   */
  public cleanup(maxAgeHours: number = 24): number {
    const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    let removed = 0;

    for (const [id, activity] of this.activities.entries()) {
      if (
        (activity.state === AlertState.RESOLVED ||
          activity.state === AlertState.FALSE_POSITIVE) &&
        activity.resolvedAt &&
        activity.resolvedAt < cutoff
      ) {
        this.activities.delete(id);
        this.alertHistory.delete(id);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Generate unique activity ID
   */
  private generateActivityId(type: ActivityType, vessels: string[]): string {
    const timestamp = Date.now();
    const vesselStr = vessels.sort().join('-');
    return `${type}_${vesselStr}_${timestamp}`;
  }

  /**
   * Add event to activity history
   */
  private addToHistory(activityId: string, event: ActivityEvent): void {
    if (!this.alertHistory.has(activityId)) {
      this.alertHistory.set(activityId, []);
    }
    this.alertHistory.get(activityId)!.push(event);
  }

  /**
   * Map alert level to severity
   */
  private mapAlertLevelToSeverity(
    level: string
  ): 'low' | 'medium' | 'high' | 'critical' {
    switch (level.toLowerCase()) {
      case 'critical':
        return 'critical';
      case 'danger':
        return 'high';
      case 'warning':
        return 'medium';
      default:
        return 'low';
    }
  }
}

export const alertManager = new AlertManager();