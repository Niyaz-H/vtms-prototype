/**
 * Activity Detection Orchestrator
 * Coordinates all suspicious activity detectors and manages alerts
 */

import { Vessel } from '../types/ais';
import {
  ActivityDetectionResult,
  SuspiciousActivity,
  ActivityType,
  ActivityEvent
} from '../types/activity';
import { vesselStore } from './vesselStore';
import { collisionDetection } from './collisionDetection';
import { rendezvousDetector } from './rendezvousDetector';
import { loiteringDetector } from './loiteringDetector';
import { alertManager } from './alertManager';

export class ActivityDetection {
  private detectionInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  /**
   * Start continuous activity detection
   */
  public start(intervalSeconds: number = 30): void {
    if (this.isRunning) {
      console.log('Activity detection already running');
      return;
    }

    this.isRunning = true;
    console.log(`Starting activity detection (interval: ${intervalSeconds}s)`);

    // Run immediately
    this.runDetection();

    // Then run at intervals
    this.detectionInterval = setInterval(() => {
      this.runDetection();
    }, intervalSeconds * 1000);
  }

  /**
   * Stop continuous activity detection
   */
  public stop(): void {
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }
    this.isRunning = false;
    console.log('Activity detection stopped');
  }

  /**
   * Run all detection algorithms
   */
  public async runDetection(): Promise<ActivityDetectionResult> {
    const startTime = Date.now();

    try {
      // Get all active vessels
      const vessels = await vesselStore.getAllVessels();

      if (vessels.length === 0) {
        return this.emptyResult(startTime);
      }

      // Run collision detection
      const collisionResult = await collisionDetection.detectCollisions();
      
      // Convert collision alerts to activities
      for (const alert of collisionResult.alerts) {
        if (!alert.resolved) {
          const activity = alertManager.createActivityFromCollision(alert);
          // Activity is already stored in alertManager
        }
      }

      // Run rendezvous detection
      const rendezvousEvents = await rendezvousDetector.detectRendezvous(vessels);
      
      // Create activities for new rendezvous
      for (const event of rendezvousEvents) {
        if (!event.inPortArea) { // Only flag if not in port
          const activity = this.createRendezvousActivity(event);
          if (activity.type && activity.vessels && activity.location &&
              activity.evidence && activity.severity) {
            alertManager.createActivity(
              activity.type,
              activity.vessels,
              activity.location,
              activity.evidence,
              activity.severity
            );
          }
        }
      }

      // Run loitering detection
      const loiteringEvents = await loiteringDetector.detectLoitering(vessels);
      
      // Create activities for new loitering
      for (const event of loiteringEvents) {
        if (!event.inAnchorageArea) { // Only flag if not in anchorage
          const activity = this.createLoiteringActivity(event);
          if (activity.type && activity.vessels && activity.location &&
              activity.evidence && activity.severity) {
            alertManager.createActivity(
              activity.type,
              activity.vessels,
              activity.location,
              activity.evidence,
              activity.severity
            );
          }
        }
      }

      const processingTime = Date.now() - startTime;

      return {
        activities: alertManager.getAllActivities(),
        rendezvousEvents: rendezvousDetector.getActiveRendezvous(),
        loiteringEvents: loiteringDetector.getActiveLoitering(),
        aisAnomalies: [], // To be implemented
        processedVessels: vessels.length,
        processingTime,
        timestamp: new Date()
      };

    } catch (error) {
      console.error('Activity detection failed:', error);
      return this.emptyResult(startTime);
    }
  }

  /**
   * Create activity from rendezvous event
   */
  private createRendezvousActivity(event: any): Partial<SuspiciousActivity> {
    const timeline: ActivityEvent[] = [
      {
        timestamp: event.startTime,
        type: 'approach',
        description: 'Vessels began approaching each other'
      },
      {
        timestamp: new Date(),
        type: 'meeting',
        description: `Vessels within ${event.minimumDistance.toFixed(2)} NM for ${Math.floor(event.duration / 60)} minutes`
      }
    ];

    if (event.endTime) {
      timeline.push({
        timestamp: event.endTime,
        type: 'departure',
        description: 'Vessels departed from meeting location'
      });
    }

    const metrics = {
      minimumDistance: event.minimumDistance,
      duration: event.duration,
      vessel1SpeedBefore: event.vessel1SpeedBefore,
      vessel1SpeedDuring: event.vessel1SpeedDuring,
      vessel2SpeedBefore: event.vessel2SpeedBefore,
      vessel2SpeedDuring: event.vessel2SpeedDuring
    };

    // Determine severity based on conditions
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    
    if (event.duration > 1800) { // > 30 minutes
      severity = 'high';
    }
    if (event.minimumDistance < 0.1 && event.duration > 600) { // Very close for > 10 min
      severity = 'critical';
    }

    return {
      type: ActivityType.SUSPICIOUS_RENDEZVOUS,
      vessels: [event.vessel1, event.vessel2],
      location: event.meetingLocation,
      evidence: {
        description: `Suspicious meeting detected between vessels ${event.vessel1} and ${event.vessel2}`,
        metrics,
        timeline
      },
      severity
    };
  }

  /**
   * Create activity from loitering event
   */
  private createLoiteringActivity(event: any): Partial<SuspiciousActivity> {
    const timeline: ActivityEvent[] = [
      {
        timestamp: event.startTime,
        type: 'loitering_start',
        description: 'Vessel began loitering in area'
      },
      {
        timestamp: new Date(),
        type: 'loitering_ongoing',
        description: `Loitering for ${Math.floor(event.duration / 60)} minutes within ${event.radius.toFixed(2)} NM radius`
      }
    ];

    if (event.endTime) {
      timeline.push({
        timestamp: event.endTime,
        type: 'loitering_end',
        description: 'Vessel departed loitering area'
      });
    }

    const metrics = {
      duration: event.duration,
      radius: event.radius,
      averageSpeed: event.averageSpeed,
      maxSpeed: event.maxSpeed
    };

    // Determine severity
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    
    if (event.duration > 14400) { // > 4 hours
      severity = 'medium';
    }
    if (event.duration > 28800) { // > 8 hours
      severity = 'high';
    }
    if (event.duration > 43200 && event.radius < 0.1) { // > 12 hours in tiny area
      severity = 'critical';
    }

    return {
      type: ActivityType.LOITERING,
      vessels: [event.vessel],
      location: event.location,
      evidence: {
        description: `Vessel ${event.vessel} loitering in area for extended period`,
        metrics,
        timeline
      },
      severity
    };
  }

  /**
   * Get current detection statistics
   */
  public getStatistics() {
    const alertStats = alertManager.getStatistics();
    const rendezvousStats = {
      active: rendezvousDetector.getActiveRendezvous().length,
      completed: rendezvousDetector.getCompletedRendezvous().length
    };
    const loiteringStats = loiteringDetector.getStatistics();

    return {
      isRunning: this.isRunning,
      alerts: alertStats,
      rendezvous: rendezvousStats,
      loitering: loiteringStats,
      lastUpdate: new Date()
    };
  }

  /**
   * Get all pending activities
   */
  public getPendingActivities(): SuspiciousActivity[] {
    return alertManager.getPendingActivities();
  }

  /**
   * Acknowledge an activity
   */
  public acknowledgeActivity(activityId: string, userId: string): boolean {
    return alertManager.acknowledgeActivity(activityId, userId);
  }

  /**
   * Start investigation
   */
  public investigateActivity(activityId: string, userId: string): boolean {
    return alertManager.startInvestigation(activityId, userId);
  }

  /**
   * Resolve an activity
   */
  public resolveActivity(
    activityId: string,
    userId: string,
    resolution: string
  ): boolean {
    return alertManager.resolveActivity(activityId, userId, resolution);
  }

  /**
   * Mark as false positive
   */
  public markFalsePositive(
    activityId: string,
    userId: string,
    reason: string
  ): boolean {
    return alertManager.markFalsePositive(activityId, userId, reason);
  }

  /**
   * Escalate an activity
   */
  public escalateActivity(
    activityId: string,
    userId: string,
    escalateTo: string,
    reason: string
  ): boolean {
    return alertManager.escalateActivity(activityId, userId, escalateTo, reason);
  }

  /**
   * Add note to activity
   */
  public addNote(activityId: string, note: string, userId: string): boolean {
    return alertManager.addNote(activityId, note, userId);
  }

  /**
   * Get activity details
   */
  public getActivity(activityId: string): SuspiciousActivity | null {
    return alertManager.getActivity(activityId);
  }

  /**
   * Get activity history
   */
  public getActivityHistory(activityId: string): ActivityEvent[] {
    return alertManager.getActivityHistory(activityId);
  }

  /**
   * Clean up old data
   */
  public cleanup(): void {
    alertManager.cleanup(24);
    rendezvousDetector.cleanup(24);
    loiteringDetector.cleanup(24);
    collisionDetection.clearResolvedAlerts(60);
  }

  /**
   * Empty result for errors
   */
  private emptyResult(startTime: number): ActivityDetectionResult {
    return {
      activities: [],
      rendezvousEvents: [],
      loiteringEvents: [],
      aisAnomalies: [],
      processedVessels: 0,
      processingTime: Date.now() - startTime,
      timestamp: new Date()
    };
  }
}

export const activityDetection = new ActivityDetection();