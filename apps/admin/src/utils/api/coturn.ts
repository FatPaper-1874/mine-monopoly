import type { CoturnMetrics } from "@/interfaces/interfaces";
import { _axios } from "@/utils/axios";
import type { ApiResponse } from "@mine-monopoly/types";

export const getCoturnMetrics = async () => {
	const res = await _axios.get<ApiResponse<CoturnMetrics>>("/coturn/metrics");
	return res.data;
};
