import { afterEach, describe, it } from '@std/testing/bdd';
import { FakeTime } from '@std/testing/time';
import { expect, fn } from '@std/expect';
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
});
