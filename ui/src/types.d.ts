type ZvlzNodeInfo = {
  city?: string;
  region?: string;
  country?: string;
  country_code?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  timezone?: string;
  isp?: string;
};

interface Window {
  getZvlzNodeInfo?: () => ZvlzNodeInfo;
  zvlzNodeInfoReady?: Promise<ZvlzNodeInfo>;
  zvlzSfx?: { play: (cue: string) => unknown };
  toggleZvlzSound?: () => void;
}

declare module "*.css";
