import {
	type Branded,
	EmptyArray,
	EmptyMap,
	getNonNull,
	minmax,
	randomId,
	toMutableArray,
	toMutableMap,
} from "../lib.ts";
import type { ControlType } from "./ControlType.ts";

export interface SerializedCCList {
	readonly type: ControlType;
	readonly ccs: readonly CC[];
}

export interface CCList {
	readonly type: ControlType;
	readonly ccIds: readonly CCId[];
	readonly ccs: ReadonlyMap<CCId, CC>;
}

export const CCList = {
	create(type: ControlType): CCList {
		return {
			type,
			ccIds: EmptyArray,
			ccs: EmptyMap,
		};
	},
	get(list: CCList, id: CCId): CC | null {
		return list.ccs.get(id) ?? null;
	},
	put(list: CCList, newCCs: Iterable<CC>): CCList {
		const ccs = toMutableMap(list.ccs);
		const ccIds = toMutableArray(list.ccIds);

		for (const newCC of newCCs) {
			const oldCC = ccs.get(newCC.id);
			if (oldCC === undefined || oldCC.tick !== newCC.tick) {
				if (oldCC !== undefined) {
					const oldIndex = binarySearch(ccIds, ccs, oldCC);
					ccIds.splice(oldIndex, 1);
				}

				const newIndex = binarySearch(ccIds, ccs, newCC);
				ccIds.splice(newIndex, 0, newCC.id);
			}
			ccs.set(newCC.id, newCC);
		}

		return { ...list, ccs, ccIds };
	},
	delete(list: CCList, ids: Iterable<CCId>): CCList {
		const ccs = toMutableMap(list.ccs);
		const ccIds = toMutableArray(list.ccIds);

		ids = [...ids];
		for (const id of ids) {
			const cc = ccs.get(id);
			if (cc === undefined) continue;

			const index = binarySearch(ccIds, ccs, cc);
			ccIds.splice(index, 1);
			ccs.delete(id);
		}

		return { ...list, ccs, ccIds };
	},
	serialize(list: CCList): SerializedCCList {
		const ccs: CC[] = [];
		for (const id of list.ccIds) {
			ccs.push(getNonNull(list.ccs.get(id)));
		}
		return { type: list.type, ccs };
	},
	deserialize(data: SerializedCCList): CCList {
		const ccs = new Map<CCId, CC>();
		const ccIds: CCId[] = [];
		for (const cc of data.ccs) {
			ccs.set(cc.id, cc);
			ccIds.push(cc.id);
		}
		return { type: data.type, ccs, ccIds };
	},
};

/**
 * 指定された値以上の値のうち最初のインデックスを返す
 * (=指定された値未満の値からなる半開区間の終端インデックス(upper_bound))
 */
function binarySearch(
	ccIds: readonly CCId[],
	ccs: ReadonlyMap<CCId, CC>,
	cc: CC,
): number {
	let min = 0;
	let max = ccIds.length;
	while (min < max) {
		const mid = (min + max) >> 1;
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		const midId = ccIds[mid]!;
		const midCC = getNonNull(ccs.get(midId));
		if (midCC.tick < cc.tick || (midCC.tick === cc.tick && midCC.id < cc.id)) {
			min = mid + 1;
		} else if (midCC.tick === cc.tick && midCC.id === cc.id) {
			return mid;
		} else {
			max = mid;
		}
	}
	return min;
}

/**
 * [0] v=0
 *
 * [0,1) mid=0 tick=0==0 return 0
 *
 */

export type CCId = Branded<string, "CCId">;

export interface CC {
	readonly id: CCId;
	readonly tick: number;
	readonly value: number;
}

export interface CCPatch {
	readonly id: CCId;
	readonly tick?: number;
	readonly tickDiff?: number;
	readonly value?: number;
	readonly valueDiff?: number;
}

export const CC = {
	generateId(): CCId {
		return randomId(16) as CCId;
	},
	applyPatch(cc: CC, patch: CCPatch): CC {
		if (patch.tick !== undefined) {
			cc = { ...cc, tick: patch.tick };
		} else if (patch.tickDiff !== undefined) {
			cc = { ...cc, tick: minmax(0, null, cc.tick + patch.tickDiff) };
		}
		if (patch.value !== undefined) {
			cc = { ...cc, value: patch.value };
		} else if (patch.valueDiff !== undefined) {
			cc = { ...cc, value: minmax(0, 127, cc.value + patch.valueDiff) };
		}
		return cc;
	},
};
