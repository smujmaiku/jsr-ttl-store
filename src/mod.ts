export interface StorePartial extends
	Pick<
		Storage,
		| 'length'
		| 'getItem'
		| 'key'
		| 'removeItem'
		| 'setItem'
	> {
}

function checkFresh(expireAt: number, now = Date.now()): boolean {
	if (expireAt === -1) return true;
	if (isNaN(expireAt)) return false;
	return expireAt > now;
}

function tryJson<T>(value: unknown): T | null {
	if (typeof value !== 'string') return null;
	try {
		return JSON.parse(value);
	} catch (_e) {}
	return null;
}

export class TTLStore {
	private makeKey(key: string): string {
		return `${this.name}:${key}`;
	}

	private makeDataKey(key: string): string {
		return `${this.name}.${key}`;
	}

	private getNext(): number {
		const value = this.store.getItem(this.makeKey('next'));
		return Number(value) || Infinity;
	}

	private $get(key: string): { expireAt: number; item: string | null } {
		const NULL_DATA = { expireAt: 1, item: null! };

		try {
			const dataKey = this.makeDataKey(key);
			const value = this.store.getItem(dataKey);

			if (!value) return NULL_DATA;
			const index = value?.indexOf(':');
			if (index < 1) return NULL_DATA;

			const expireAt = Number(value.slice(0, index));
			if (!checkFresh(expireAt)) return NULL_DATA;

			const item = value.slice(index + 1);
			return { expireAt, item };
		} catch (_e) {}

		return NULL_DATA;
	}

	private $set(key: string, item: string | null, expireAt: number): void {
		const dataKey = this.makeDataKey(key);

		if (item === null || !checkFresh(expireAt)) {
			this.store.removeItem(dataKey);
			return;
		}

		this.store.setItem(dataKey, `${expireAt}:${item}`);

		if (isNaN(expireAt) || expireAt > this.getNext()) return;

		this.store.setItem(this.makeKey('next'), expireAt.toFixed());
	}

	private $list(): Record<string, number> {
		const prefix = this.makeDataKey('');
		const data: Record<string, number> = {};

		for (let i = 0; i < this.store.length; i++) {
			const skey = this.store.key(i);
			if (!skey?.startsWith(prefix)) continue;
			const key = skey.slice(prefix.length);

			const { expireAt } = this.$get(key);
			data[key] = Number(expireAt);
		}

		return data;
	}

	constructor(private name: string, private store: StorePartial) {
		this.clean();
	}

	/**
	 * Clean the storage of expired values
	 */
	clean(): void {
		const now = Date.now();
		const next = this.getNext();
		if (next > now) return;

		const data = this.$list();
		for (const [key, expireAt] of Object.entries(data)) {
			if (checkFresh(expireAt, now)) continue;
			this.$set(key, null, -1);
		}
	}

	/**
	 * Expire a value in a time
	 * @param expire in seconds
	 */
	setExpire(key: string, expire = -1): void {
		const now = Date.now();
		if (expire < 0) {
			return this.setExpireAt(key);
		}
		return this.setExpireAt(key, now + expire * 1000);
	}

	/**
	 * Expire a value at a time
	 * @param expireAt at epoch ms
	 */
	setExpireAt(key: string, expireAt = -1): void {
		const { item } = this.$get(key);
		this.$set(key, item, expireAt);
	}

	/**
	 * Get a value
	 */
	getItem<T>(key: string): T | null {
		this.clean();
		return tryJson(this.$get(key).item);
	}

	/**
	 * Remove a value from storage
	 */
	removeItem(key: string): void {
		this.$set(key, null, -1);
	}

	/**
	 * Set a value for a time
	 * @param expire in seconds
	 */
	setItem<T = unknown>(key: string, value: T, expire = -1): void {
		const now = Date.now();
		if (expire < 0) {
			return this.setItemUntil(key, value);
		}
		return this.setItemUntil(key, value, now + expire * 1000);
	}

	/**
	 * Set a value until a time
	 * @param expireAt at epoch ms
	 */
	setItemUntil<T = unknown>(key: string, value: T, expireAt = -1): void {
		try {
			const item = JSON.stringify(value);
			this.$set(key, item, expireAt);
		} catch (_e) {}
	}

	/**
	 * Update item without changing expire
	 */
	updateItem<T = unknown>(key: string, value: T): void {
		const { expireAt } = this.$get(key);
		this.setItemUntil(key, value, expireAt);
	}
}

export default TTLStore;
