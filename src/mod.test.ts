import { afterEach, describe, it } from '@std/testing/bdd';
import { FakeTime } from '@std/testing/time';
import { expect } from '@std/expect';
import TTLStore from './mod.ts';

describe('TTLStore', () => {
	afterEach(() => {
		sessionStorage.clear();
		localStorage.clear();
	});

	it('should store state', async () => {
		using _time = new FakeTime();

		const store = new TTLStore('mock', localStorage);

		store.setItem('one', 'mock1');
		expect(store.getItem('one')).toEqual('mock1');
	});

	it('should expire state', async () => {
		using mockTime = new FakeTime();

		const store = new TTLStore('mock', localStorage);

		store.setItem('one', 'mock1', 10);
		await mockTime.tickAsync(9_000);
		expect(store.getItem('one')).toEqual('mock1');
		expect(localStorage.length).toBe(2);

		await mockTime.tickAsync(2_000);
		expect(store.getItem('one')).toBeNull();
		expect(localStorage.length).toBe(1);
	});
});
