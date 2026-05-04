import { Router, RequestHandler } from "express";
import http from "http";
import { ResInterface } from "#src/interfaces/res";

export const coturnRouter = Router();

const COTURN_METRICS_URL = "http://monopoly-coturn:9641/metrics";
const TIMEOUT_MS = 5000;

function parsePrometheusText(body: string) {
	const allocations = { udp: 0, tcp: 0, tls: 0, dtls: 0, total: 0 };
	const traffic = {
		receivedBytes: 0, sentBytes: 0,
		receivedPackets: 0, sentPackets: 0,
		peerReceivedBytes: 0, peerSentBytes: 0,
	};
	const packets = { processed: 0, dropped: 0 };
	const stun = { bindingRequests: 0, bindingResponses: 0, bindingErrors: 0 };

	for (const line of body.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;

		const match = trimmed.match(/^([a-z_]+)(?:\{(.+?)\})?\s+(\d+)$/);
		if (!match) continue;

		const [, name, labelsRaw, valueStr] = match;
		const value = Number(valueStr);

		const labels: Record<string, string> = {};
		if (labelsRaw) {
			for (const pair of labelsRaw.split(",")) {
				const [k, v] = pair.split("=");
				if (k && v) labels[k.trim()] = v.replace(/"/g, "");
			}
		}

		switch (name) {
			case "turn_total_allocations": {
				const type = labels.type?.toLowerCase();
				if (type === "udp") allocations.udp = value;
				else if (type === "tcp") allocations.tcp = value;
				else if (type === "tls") allocations.tls = value;
				else if (type === "dtls") allocations.dtls = value;
				break;
			}
			case "turn_total_traffic_rcvb": traffic.receivedBytes = value; break;
			case "turn_total_traffic_sentb": traffic.sentBytes = value; break;
			case "turn_total_traffic_rcvp": traffic.receivedPackets = value; break;
			case "turn_total_traffic_sentp": traffic.sentPackets = value; break;
			case "turn_total_traffic_peer_rcvb": traffic.peerReceivedBytes = value; break;
			case "turn_total_traffic_peer_sentb": traffic.peerSentBytes = value; break;
			case "turn_packet_processed": packets.processed = value; break;
			case "turn_packet_dropped": packets.dropped = value; break;
			case "stun_binding_request": stun.bindingRequests = value; break;
			case "stun_binding_response": stun.bindingResponses = value; break;
			case "stun_binding_error": stun.bindingErrors = value; break;
		}
	}

	allocations.total = allocations.udp + allocations.tcp + allocations.tls + allocations.dtls;

	return { allocations, traffic, packets, stun };
}

const getMetrics: RequestHandler = (req, res) => {
	const url = new URL(COTURN_METRICS_URL);
	http.get(
		{
			hostname: url.hostname,
			port: url.port,
			path: url.pathname,
			timeout: TIMEOUT_MS,
		},
		(response) => {
			if (response.statusCode !== 200) {
				const resContent: ResInterface = {
					status: 502,
					msg: `coturn 返回状态码 ${response.statusCode}`,
				};
				res.status(502).json(resContent);
				return;
			}

			let body = "";
			response.on("data", (chunk) => { body += chunk; });
			response.on("end", () => {
				const data = parsePrometheusText(body);
				const resContent: ResInterface = { status: 200, data };
				res.json(resContent);
			});
		},
	).on("error", (err) => {
		const resContent: ResInterface = {
			status: 502,
			msg: `无法连接 coturn: ${err.message}`,
		};
		res.status(502).json(resContent);
	}).on("timeout", () => {
		const resContent: ResInterface = {
			status: 504,
			msg: "coturn 响应超时",
		};
		res.status(504).json(resContent);
	});
};

coturnRouter.get("/metrics", getMetrics);
