import { AbstractRgbEffectProperty } from "./AbstractRgbEffectProperty";

export type SetPropertyResult<T> = | { success: true, property: AbstractRgbEffectProperty<T> } | { success: false; error: string };
