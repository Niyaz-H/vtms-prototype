/**
 * AIS Parser Service
 * Handles parsing of AIS NMEA sentences and extraction of vessel data
 */

import {
  AISMessage,
  AISNMEASentence,
  AISParserResult,
  AISMessageType,
  AISVesselDynamic,
  AISVesselStatic,
  Vessel,
  NavigationalStatus
} from '../types';

export class AISParser {
  private messageBuffer: Map<string, string[]> = new Map();

  /**
   * Parse a raw AIS NMEA sentence
   */
  public parseSentence(rawSentence: string): AISParserResult {
    try {
      const nmea = this.parseNMEASentence(rawSentence);
      if (!nmea) {
        return {
          success: false,
          error: 'Invalid NMEA sentence format'
        };
      }

      // Handle multi-sentence messages
      if (nmea.totalFragments > 1) {
        return this.handleMultiSentenceMessage(nmea, rawSentence);
      }

      // Parse single sentence message
      const decodedPayload = this.decodePayload(nmea.payload);
      const messageType = this.extractMessageType(decodedPayload);

      const aisMessage: AISMessage = {
        type: messageType,
        mmsi: this.extractMMSI(decodedPayload, messageType),
        raw: rawSentence,
        timestamp: new Date(),
        data: this.parseMessageData(messageType, decodedPayload)
      };

      return {
        success: true,
        message: aisMessage
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown parsing error'
      };
    }
  }

  /**
   * Parse NMEA sentence format
   */
  private parseNMEASentence(sentence: string): AISNMEASentence | null {
    // Remove leading/trailing whitespace
    sentence = sentence.trim();

    // Check for NMEA format
    if (!sentence.startsWith('!') || !sentence.includes('*')) {
      return null;
    }

    const parts = sentence.split('*');
    if (parts.length !== 2) {
      return null;
    }

    const [header, checksum] = parts;
    const headerParts = header.split(',');

    if (headerParts.length < 7) {
      return null;
    }

    // Verify checksum
    const calculatedChecksum = this.calculateChecksum(header.substring(1));
    if (calculatedChecksum.toUpperCase() !== checksum.toUpperCase()) {
      throw new Error(`Checksum mismatch: expected ${checksum}, got ${calculatedChecksum}`);
    }

    return {
      prefix: headerParts[0],
      totalFragments: parseInt(headerParts[1], 10),
      fragmentNumber: parseInt(headerParts[2], 10),
      sequenceId: headerParts[3] ? parseInt(headerParts[3], 10) : undefined,
      channel: headerParts[4] as 'A' | 'B',
      payload: headerParts[5],
      checksum: checksum
    };
  }

  /**
   * Calculate NMEA checksum
   */
  private calculateChecksum(sentence: string): string {
    let checksum = 0;
    for (let i = 0; i < sentence.length; i++) {
      checksum ^= sentence.charCodeAt(i);
    }
    return checksum.toString(16).toUpperCase().padStart(2, '0');
  }

  /**
   * Handle multi-sentence AIS messages
   */
  private handleMultiSentenceMessage(nmea: AISNMEASentence, rawSentence: string): AISParserResult {
    const key = `${nmea.sequenceId || 'unknown'}_${nmea.totalFragments}`;
    
    if (!this.messageBuffer.has(key)) {
      this.messageBuffer.set(key, []);
    }

    const fragments = this.messageBuffer.get(key)!;
    fragments[nmea.fragmentNumber - 1] = nmea.payload;

    // Check if we have all fragments
    if (fragments.length === nmea.totalFragments && fragments.every(f => f !== undefined)) {
      const combinedPayload = fragments.join('');
      this.messageBuffer.delete(key);

      try {
        const decodedPayload = this.decodePayload(combinedPayload);
        const messageType = this.extractMessageType(decodedPayload);

        const aisMessage: AISMessage = {
          type: messageType,
          mmsi: this.extractMMSI(decodedPayload, messageType),
          raw: rawSentence,
          timestamp: new Date(),
          data: this.parseMessageData(messageType, decodedPayload)
        };

        return {
          success: true,
          message: aisMessage
        };
      } catch (error) {
        this.messageBuffer.delete(key);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to parse combined message'
        };
      }
    }

    // Waiting for more fragments
    return {
      success: false,
      error: `Waiting for more fragments (${fragments.length}/${nmea.totalFragments})`
    };
  }

  /**
   * Decode AIS payload from 6-bit ASCII to binary
   */
  private decodePayload(payload: string): string {
    let binary = '';
    for (let i = 0; i < payload.length; i++) {
      const char = payload.charCodeAt(i);
      if (char >= 48 && char <= 87) { // 0-9, W
        binary += (char - 48).toString(2).padStart(6, '0');
      } else if (char >= 96 && char <= 119) { // a-w
        binary += (char - 87).toString(2).padStart(6, '0');
      } else {
        throw new Error(`Invalid character in payload: ${payload[i]}`);
      }
    }
    return binary;
  }

  /**
   * Extract message type from binary payload
   */
  private extractMessageType(binary: string): number {
    return parseInt(binary.substring(0, 6), 2);
  }

  /**
   * Extract MMSI from binary payload
   */
  private extractMMSI(binary: string, messageType: number): number {
    let mmsiStart = 8; // Default start position
    
    // Different message types have MMSI at different positions
    if (messageType === 4 || messageType === 11 || messageType === 21) {
      mmsiStart = 8;
    } else if (messageType === 5 || messageType === 19 || messageType === 24) {
      mmsiStart = 8;
    }

    const mmsiBinary = binary.substring(mmsiStart, mmsiStart + 30);
    return parseInt(mmsiBinary, 2);
  }

  /**
   * Parse message data based on message type
   */
  private parseMessageData(messageType: number, binary: string): any {
    switch (messageType) {
      case AISMessageType.POSITION_REPORT_CLASS_A_SCHEDULED:
      case AISMessageType.POSITION_REPORT_CLASS_A_ASSIGNED:
      case AISMessageType.POSITION_REPORT_CLASS_A_RESPONSE:
      case AISMessageType.STANDARD_CLASS_B_CS_POSITION_REPORT:
        return this.parsePositionReport(binary, messageType);

      case AISMessageType.STATIC_AND_VOYAGE_DATA:
      case AISMessageType.STATIC_DATA_REPORT:
        return this.parseStaticData(binary, messageType);

      case AISMessageType.EXTENDED_CLASS_B_CS_POSITION_REPORT:
        return this.parseExtendedPositionReport(binary);

      default:
        return { raw: binary };
    }
  }

  /**
   * Parse position report (types 1, 2, 3, 18)
   */
  private parsePositionReport(binary: string, messageType: number): AISVesselDynamic {
    const data: any = {};

    // Position accuracy
    data.positionAccuracy = binary.charAt(60) === '1';

    // Longitude (minutes/10000)
    let longitude = parseInt(binary.substring(61, 89), 2);
    if (binary.charAt(61) === '1') {
      longitude -= Math.pow(2, 28);
    }
    data.longitude = longitude / 600000.0;

    // Latitude (minutes/10000)
    let latitude = parseInt(binary.substring(89, 116), 2);
    if (binary.charAt(89) === '1') {
      latitude -= Math.pow(2, 27);
    }
    data.latitude = latitude / 600000.0;

    // Speed over ground (knots)
    data.speed = parseInt(binary.substring(50, 60), 2) * 0.1;

    // Course over ground (degrees)
    data.course = parseInt(binary.substring(116, 128), 2) * 0.1;

    // True heading (degrees)
    data.heading = parseInt(binary.substring(128, 137), 2);

    // Timestamp (seconds)
    data.timestamp = parseInt(binary.substring(137, 143), 2);

    // Navigational status
    data.status = parseInt(binary.substring(38, 42), 2);

    // Rate of turn
    let rot = parseInt(binary.substring(42, 50), 2);
    if (rot > 127) rot -= 256;
    data.rot = rot * 4.733; // degrees per minute

    return {
      mmsi: this.extractMMSI(binary, messageType),
      position: {
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: data.positionAccuracy
      },
      course: data.course,
      speed: data.speed,
      heading: data.heading,
      timestamp: new Date(),
      status: data.status,
      rot: data.rot
    };
  }

  /**
   * Parse static and voyage data (types 5, 24)
   */
  private parseStaticData(binary: string, messageType: number): AISVesselStatic {
    const data: any = {};

    if (messageType === 5) {
      // Call sign
      data.callSign = this.decode6BitString(binary.substring(70, 112)).trim();

      // Vessel name
      data.name = this.decode6BitString(binary.substring(112, 232)).trim();

      // Vessel type
      data.vesselType = parseInt(binary.substring(232, 240), 2);

      // Dimension
      const dimensionA = parseInt(binary.substring(240, 249), 2); // To bow
      const dimensionB = parseInt(binary.substring(249, 258), 2); // To stern
      const dimensionC = parseInt(binary.substring(258, 264), 2); // To port
      const dimensionD = parseInt(binary.substring(264, 270), 2); // To starboard

      data.dimension = {
        length: dimensionA + dimensionB,
        width: dimensionC + dimensionD,
        bow: dimensionA,
        stern: dimensionB,
        port: dimensionC,
        starboard: dimensionD
      };

      // Draught
      data.draught = parseInt(binary.substring(294, 302), 2) * 0.1;

      // Destination
      data.destination = this.decode6BitString(binary.substring(302, 422)).trim();
    } else if (messageType === 24) {
      // Part number
      const partNumber = parseInt(binary.substring(38, 40), 2);

      if (partNumber === 0) {
        // Part A - Name
        data.name = this.decode6BitString(binary.substring(40, 160)).trim();
      } else {
        // Part B - Type and callsign
        data.vesselType = parseInt(binary.substring(40, 48), 2);
        data.callSign = this.decode6BitString(binary.substring(90, 132)).trim();
      }
    }

    return {
      mmsi: this.extractMMSI(binary, messageType),
      name: data.name,
      callSign: data.callSign,
      vesselType: data.vesselType,
      dimension: data.dimension,
      draught: data.draught,
      destination: data.destination
    };
  }

  /**
   * Parse extended class B position report (type 19)
   */
  private parseExtendedPositionReport(binary: string): AISVesselDynamic & Partial<AISVesselStatic> {
    const positionData = this.parsePositionReport(binary, 19);
    
    // Additional fields for type 19
    const data: any = {};

    // Vessel name
    data.name = this.decode6BitString(binary.substring(143, 263)).trim();

    // Vessel type
    data.vesselType = parseInt(binary.substring(263, 271), 2);

    // Dimension
    const dimensionA = parseInt(binary.substring(271, 280), 2);
    const dimensionB = parseInt(binary.substring(280, 289), 2);
    const dimensionC = parseInt(binary.substring(289, 295), 2);
    const dimensionD = parseInt(binary.substring(295, 301), 2);

    data.dimension = {
      length: dimensionA + dimensionB,
      width: dimensionC + dimensionD,
      bow: dimensionA,
      stern: dimensionB,
      port: dimensionC,
      starboard: dimensionD
    };

    return {
      ...positionData,
      name: data.name,
      vesselType: data.vesselType,
      dimension: data.dimension
    };
  }

  /**
   * Decode 6-bit ASCII string
   */
  private decode6BitString(binary: string): string {
    let result = '';
    for (let i = 0; i < binary.length; i += 6) {
      const charCode = parseInt(binary.substring(i, i + 6), 2);
      if (charCode < 32) continue; // Skip control characters
      result += String.fromCharCode(charCode + 32);
    }
    return result;
  }

  /**
   * Convert AIS message to Vessel object
   */
  public messageToVessel(message: AISMessage, existingVessel?: Vessel): Vessel {
    const baseVessel = {
      mmsi: message.mmsi,
      lastUpdate: message.timestamp,
      source: 'AIS' as const
    };

    const vesselData = this.extractVesselData(message);
    
    if (existingVessel) {
      // Merge with existing vessel data
      const mergedVessel: Vessel = {
        ...existingVessel,
        ...baseVessel,
        ...vesselData,
        id: existingVessel.id,
        position: vesselData.position || existingVessel.position
      };
      return mergedVessel;
    } else {
      // Create new vessel
      if (!vesselData.position) {
        throw new Error('Position data required for new vessel');
      }
      const newVessel: Vessel = {
        id: `vessel_${message.mmsi}_${Date.now()}`,
        ...baseVessel,
        ...vesselData,
        position: vesselData.position,
        timestamp: vesselData.timestamp || message.timestamp
      };
      return newVessel;
    }
  }

  /**
   * Extract vessel data from AIS message
   */
  private extractVesselData(message: AISMessage): Partial<Vessel> {
    const data: Partial<Vessel> = {};

    switch (message.type) {
      case AISMessageType.POSITION_REPORT_CLASS_A_SCHEDULED:
      case AISMessageType.POSITION_REPORT_CLASS_A_ASSIGNED:
      case AISMessageType.POSITION_REPORT_CLASS_A_RESPONSE:
      case AISMessageType.STANDARD_CLASS_B_CS_POSITION_REPORT:
      case AISMessageType.EXTENDED_CLASS_B_CS_POSITION_REPORT:
        Object.assign(data, message.data as AISVesselDynamic);
        break;

      case AISMessageType.STATIC_AND_VOYAGE_DATA:
      case AISMessageType.STATIC_DATA_REPORT:
        Object.assign(data, message.data as AISVesselStatic);
        break;

      default:
        break;
    }

    return data;
  }
}

export const aisParser = new AISParser();