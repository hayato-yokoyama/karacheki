import { tokens } from "@tamagui/config/v3";
import { createTamagui } from "tamagui";
import * as themes from "./theme-output";

export const tamaguiConfig = createTamagui({tokens, themes});

export default tamaguiConfig;

export type Conf = typeof tamaguiConfig;

declare module "tamagui" {
	interface TamaguiCustomConfig extends Conf {}
}
