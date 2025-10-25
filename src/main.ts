import {
  assertFinite,
  assertNonNullable,
  parseFloatX,
  parseIntX,
} from "phil-lib/misc";
import "./style.css";
import { getById } from "phil-lib/client-misc";

const dFarInput = getById("d-far", HTMLInputElement);
const dNearInput = getById("d-near", HTMLInputElement);
const progressInput = getById("progress", HTMLInputElement);

function parseFraction(input: string): number | undefined {
  const fractionRE = /^ *(-)?(\d+ +)?(\d+) *\/ *(\d+) *$/;
  let result: number | undefined;
  const fractionResult = fractionRE.exec(input);
  if (fractionResult) {
    const [
      ,
      signString,
      wholeNumberString,
      numeratorString,
      denominatorString,
    ] = fractionResult;
    const wholeNumber =
      wholeNumberString === undefined
        ? 0
        : assertNonNullable(parseIntX(wholeNumberString));
    const numerator = assertNonNullable(parseIntX(numeratorString));
    const denominator = assertNonNullable(parseIntX(denominatorString));
    const sign = signString === "-" ? -1 : 1;
    if (denominator == 0) {
      return undefined;
    } else {
      return sign * (wholeNumber + numerator / denominator);
    }
  } else {
    return parseFloatX(input);
  }
}

function getNumberValue(inputElement: HTMLInputElement) {
  const rawString = inputElement.value;
  const result = parseFraction(rawString);
  if (result === undefined) {
    inputElement.style.backgroundColor = "pink";
  } else {
    inputElement.style.backgroundColor = "";
  }
  return result;
}

(window as any).PHIL = {
  dFarInput,
  dNearInput,
  progressInput,
  parseFraction,
  getNumberValue,
};
