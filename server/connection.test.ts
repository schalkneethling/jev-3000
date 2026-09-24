import { channel } from "node:diagnostics_channel";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { CONNECTED_CHANNEL, ConnectionDetector, TypeSafeConnection } from "./connection.ts";

const HOST = "api.typesafe.ai";
const ORIGIN = `https://${HOST}`;

/** What undici publishes once a socket is open; only `connectParams.host` is read. */
function publishConnected(host: string): void {
  channel(CONNECTED_CHANNEL).publish({
    connectParams: { host, hostname: host, protocol: "https:", port: "", servername: host },
  });
}

describe("ConnectionDetector", () => {
  it("reports a reused connection when nothing connected during the call", () => {
    const detector = new ConnectionDetector();
    const call = detector.begin(HOST);
    expect(call.finish()).toBe("reused");
    expect(detector.pending).toBe(0);
  });

  it("reports a new connection when one opened during the call", () => {
    const detector = new ConnectionDetector();
    const call = detector.begin(HOST);
    detector.connected(HOST);
    expect(call.finish()).toBe("new");
  });

  it("ignores connections to other hosts", () => {
    const detector = new ConnectionDetector();
    const call = detector.begin(HOST);
    detector.connected("fonts.googleapis.com");
    expect(call.finish()).toBe("reused");
  });

  it("ignores connections opened before or after the call", () => {
    const detector = new ConnectionDetector();
    detector.connected(HOST);
    const call = detector.begin(HOST);
    expect(call.finish()).toBe("reused");
    detector.connected(HOST);
    expect(detector.begin(HOST).finish()).toBe("reused");
  });

  it("gives each connection to one overlapping call, oldest first", () => {
    const detector = new ConnectionDetector();
    const first = detector.begin(HOST);
    const second = detector.begin(HOST);
    detector.connected(HOST);
    expect(second.finish()).toBe("reused");
    expect(first.finish()).toBe("new");
  });

  it("gives a second connection to the next call still waiting", () => {
    const detector = new ConnectionDetector();
    const first = detector.begin(HOST);
    const second = detector.begin(HOST);
    detector.connected(HOST);
    detector.connected(HOST);
    expect(first.finish()).toBe("new");
    expect(second.finish()).toBe("new");
  });

  it("keeps its first answer when finished twice", () => {
    const detector = new ConnectionDetector();
    const call = detector.begin(HOST);
    detector.connected(HOST);
    expect(call.finish()).toBe("new");
    expect(call.finish()).toBe("new");
  });
});

describe("TypeSafeConnection.measure", () => {
  let connection: TypeSafeConnection | undefined;

  afterEach(async () => {
    await connection?.close();
    connection = undefined;
  });

  it("hears undici's connected channel while a call is in flight", async () => {
    connection = new TypeSafeConnection();
    const result = await connection.measure(ORIGIN, async () => {
      publishConnected(HOST);
      return "answer";
    });
    expect(result.value).toBe("answer");
    expect(result.connection).toBe("new");
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("reports reuse when no socket opened", async () => {
    connection = new TypeSafeConnection();
    const result = await connection.measure(ORIGIN, async () => "answer");
    expect(result.connection).toBe("reused");
  });

  it("stops listening once closed", async () => {
    connection = new TypeSafeConnection();
    await connection.close();
    expect(channel(CONNECTED_CHANNEL).hasSubscribers).toBe(false);
  });

  it("rethrows a failed call", async () => {
    connection = new TypeSafeConnection();
    await expect(
      connection.measure(ORIGIN, async () => {
        throw new Error("offline");
      }),
    ).rejects.toThrow("offline");
  });

  it("starts at Node's default keep-alive and changes it on request", () => {
    connection = new TypeSafeConnection();
    expect(connection.keepAliveSeconds).toBe(4);
    connection.setKeepAlive(60);
    expect(connection.keepAliveSeconds).toBe(60);
  });
});
