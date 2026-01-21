import type { DataSourceAdapter, DataSourceType } from "@/types/port";
import { LibreNMSAdapter } from "./librenms";
import { NetDiscoAdapter } from "./netdisco";

export function createDataSourceAdapter(): DataSourceAdapter {
  const dataSource = (process.env.DATA_SOURCE || "librenms") as DataSourceType;

  switch (dataSource) {
    case "netdisco":
      return new NetDiscoAdapter();
    case "librenms":
    default:
      return new LibreNMSAdapter();
  }
}

export { LibreNMSAdapter, NetDiscoAdapter };
