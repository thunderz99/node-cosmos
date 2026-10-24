import {
    addExpireAt,
    ensureIdentifier,
} from "../../src/cosmos/impl/postgresql/PostgresDatabaseImpl";

describe("PostgresDatabaseImpl addExpireAt", () => {
    const fixedNow = 1_700_000_000_000;

    beforeEach(() => {
        jest.spyOn(Date, "now").mockReturnValue(fixedNow);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("returns undefined when ttl is absent", () => {
        const data: Record<string, unknown> = { id: "id1" };
        const expireAt = addExpireAt(data);
        expect(expireAt).toBeUndefined();
        expect(data._expireAt).toBeUndefined();
    });

    it("returns undefined when ttl is null", () => {
        const data: Record<string, unknown> = { id: "id1", ttl: null };
        const expireAt = addExpireAt(data);
        expect(expireAt).toBeUndefined();
        expect(data._expireAt).toBeUndefined();
    });

    it("returns undefined when ttl is not parsable", () => {
        const data: Record<string, unknown> = { id: "id1", ttl: "invalid" };
        const expireAt = addExpireAt(data);
        expect(expireAt).toBeUndefined();
        expect(data._expireAt).toBeUndefined();
    });

    it("returns undefined when ttl is not a number type", () => {
        const data: Record<string, unknown> = { id: "id1", ttl: BigInt(60) };
        const expireAt = addExpireAt(data);
        expect(expireAt).toBeUndefined();
        expect(data._expireAt).toBeUndefined();
    });

    it("adds expireAt when ttl is an integer", () => {
        const ttl = 60;
        const data: Record<string, unknown> = { id: "id1", ttl };
        const expireAt = addExpireAt(data);
        expect(expireAt).toEqual(Math.floor(fixedNow / 1000) + ttl);
        expect(data._expireAt).toEqual(expireAt);
    });

    it("adds expireAt when ttl is zero or negative", () => {
        const zeroTtl: Record<string, unknown> = { id: "zero", ttl: 0 };
        const zeroExpire = addExpireAt(zeroTtl);
        expect(zeroExpire).toEqual(Math.floor(fixedNow / 1000));
        expect(zeroTtl._expireAt).toEqual(zeroExpire);

        const negativeTtl: Record<string, unknown> = { id: "negative", ttl: -30 };
        const negativeExpire = addExpireAt(negativeTtl);
        expect(negativeExpire).toEqual(Math.floor(fixedNow / 1000) - 30);
        expect(negativeTtl._expireAt).toEqual(negativeExpire);
    });

    it("handles large ttl values (30 days and beyond)", () => {
        const thirtyDays = 30 * 24 * 60 * 60;
        const data30 = { id: "id30", ttl: thirtyDays };
        const expire30 = addExpireAt(data30);
        expect(expire30).toEqual(Math.floor(fixedNow / 1000) + thirtyDays);

        const almostIntMax = Math.floor((2147483647 - 1) / 1000);
        const dataLong = { id: "idLong", ttl: almostIntMax };
        const expireLong = addExpireAt(dataLong);
        expect(expireLong).toEqual(Math.floor(fixedNow / 1000) + almostIntMax);
    });

    it("truncates fractional TTL values to whole seconds", () => {
        const data: Record<string, unknown> = { ttl: 60.9 };
        expect(addExpireAt(data)).toBe(Math.floor(fixedNow / 1000) + 60);
        expect(data._expireAt).toBe(Math.floor(fixedNow / 1000) + 60);
    });

    it.each([undefined, null, "60", NaN, Infinity, -Infinity])(
        "clears stale expiry metadata when ttl is invalid: %s",
        (ttl) => {
            const data: Record<string, unknown> = { ttl, _expireAt: 123 };
            expect(addExpireAt(data)).toBeUndefined();
            expect(data).not.toHaveProperty("_expireAt");
        },
    );
});

describe("PostgresDatabaseImpl ensureIdentifier", () => {
    it("allows identifiers that do not contain invalid characters", () => {
        expect(() => ensureIdentifier("valid_name-123", "identifier")).not.toThrow();
        expect(() => ensureIdentifier("_hiddenTable42", "identifier")).not.toThrow();
        expect(() => ensureIdentifier('table-"123', "identifier")).not.toThrow();
        expect(() => ensureIdentifier("従業員", "identifier")).not.toThrow();
    });

    it("throws when the identifier is empty", () => {
        expect(() => ensureIdentifier("", "emptyField")).toThrow(
            "Expected 'emptyField' to be nonempty",
        );
    });

    it.each([
        "bad;name",
        "bad,name",
        "bad&name",
        "bad'name",
        "bad\\name",
        "bad(name",
        "bad)name",
        "bad\tname",
        "bad\nname",
        "bad\rname",
    ])("throws when identifier contains invalid characters: %s", (badIdentifier) => {
        expect(() => ensureIdentifier(badIdentifier, "table")).toThrow(
            `table should not contain invalid characters: ${badIdentifier}`,
        );
    });

    it("throws when identifier contains new line characters", () => {
        expect(() => ensureIdentifier("bad\nname", "schema")).toThrow(
            "schema should not contain invalid characters: bad\nname",
        );
    });

    it("throws when identifier contains '--'", () => {
        expect(() => ensureIdentifier("bad--name", "schema")).toThrow(
            "schema should not contain '--': bad--name",
        );
    });
});
