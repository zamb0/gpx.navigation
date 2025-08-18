import { Coordinates } from './types';

// Base types that don't depend on TrackPoint class
export interface SimplePoint {
    getCoordinates(): Coordinates;
}

export type SimplifiedPoint<T extends SimplePoint> = { point: T; distance?: number };

const earthRadius = 6371008.8;

export function ramerDouglasPeuckerGeneric<T extends SimplePoint>(
    points: T[],
    epsilon: number = 50,
    measure: (a: T, b: T, c: T) => number = crossarcDistanceGeneric
): SimplifiedPoint<T>[] {
    if (points.length == 0) {
        return [];
    } else if (points.length == 1) {
        return [
            {
                point: points[0],
            },
        ];
    }

    let simplified = [
        {
            point: points[0],
        },
    ];
    ramerDouglasPeuckerRecursiveGeneric(points, epsilon, measure, 0, points.length - 1, simplified);
    simplified.push({
        point: points[points.length - 1],
    });

    return simplified;
}

function ramerDouglasPeuckerRecursiveGeneric<T extends SimplePoint>(
    points: T[],
    epsilon: number,
    measure: (a: T, b: T, c: T) => number,
    startIndex: number,
    endIndex: number,
    simplified: SimplifiedPoint<T>[]
): void {
    if (endIndex <= startIndex + 1) {
        return;
    }

    let index = startIndex + 1;
    let maxDistance = 0;

    for (let i = startIndex + 1; i < endIndex; i++) {
        const distance = measure(points[startIndex], points[endIndex], points[i]);

        if (distance > maxDistance) {
            index = i;
            maxDistance = distance;
        }
    }

    if (maxDistance > epsilon) {
        ramerDouglasPeuckerRecursiveGeneric(points, epsilon, measure, startIndex, index, simplified);
        simplified.push({
            point: points[index],
            distance: maxDistance,
        });
        ramerDouglasPeuckerRecursiveGeneric(points, epsilon, measure, index, endIndex, simplified);
    }
}

function crossarcDistanceGeneric<T extends SimplePoint>(a: T, b: T, c: T): number {
    const aCoords = a.getCoordinates();
    const bCoords = b.getCoordinates();
    const cCoords = c.getCoordinates();

    return crossarcDistance(aCoords, bCoords, cCoords);
}

export function crossarcDistance(a: Coordinates, b: Coordinates, c: Coordinates): number {
    if (a.lat == c.lat && a.lon == c.lon) {
        return 0;
    }

    const lat1 = (a.lat * Math.PI) / 180;
    const lon1 = (a.lon * Math.PI) / 180;
    const lat2 = (b.lat * Math.PI) / 180;
    const lon2 = (b.lon * Math.PI) / 180;
    const lat3 = (c.lat * Math.PI) / 180;
    const lon3 = (c.lon * Math.PI) / 180;

    const deltalon = lon1 - lon2;
    const deltalat = lat1 - lat2;
    const a1 = Math.sin(deltalat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltalon / 2) ** 2;
    const c1 = 2 * Math.asin(Math.sqrt(a1));
    const deltalonb = lon3 - lon2;
    const deltalatb = lat3 - lat2;
    const a2 = Math.sin(deltalatb / 2) ** 2 + Math.cos(lat3) * Math.cos(lat2) * Math.sin(deltalonb / 2) ** 2;
    const c2 = 2 * Math.asin(Math.sqrt(a2));

    const deltalon2 = lon1 - lon3;
    const deltalat2 = lat1 - lat3;
    const a3 = Math.sin(deltalat2 / 2) ** 2 + Math.cos(lat1) * Math.cos(lat3) * Math.sin(deltalon2 / 2) ** 2;
    const c3 = 2 * Math.asin(Math.sqrt(a3));

    const d1 = earthRadius * c1;
    const d2 = earthRadius * c2;
    const d3 = earthRadius * c3;

    if (d1 == 0 || d2 == 0) {
        return 0;
    }

    const s = (d1 + d2 + d3) / 2;
    const area = Math.sqrt(s * (s - d1) * (s - d2) * (s - d3));

    return (2 * area) / d3;
}
