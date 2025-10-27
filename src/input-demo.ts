import { AnimationLoop, getById } from "phil-lib/client-misc";
import { initializedArray, lerp, Random } from "phil-lib/misc";

const leftEdgeX = 0.2;
const farLineX = 1;
const farLineTopY = 1;
const farLineBottomY = 3.25;
const nearLineX = 2;
const vanishingPointX = 8;
const vanishingPointY = 2.5;

const xToNearLine = vanishingPointX - nearLineX;
const xToFarLine = vanishingPointX - farLineX;
const xToLeftEdge = vanishingPointX - leftEdgeX;

function scaleToLeftEdge(farLineY: number) {
  return (
    ((farLineY - vanishingPointY) * xToLeftEdge) / xToFarLine + vanishingPointY
  );
}

function scaleToNearLine(farLineY: number) {
  return (
    ((farLineY - vanishingPointY) * xToNearLine) / xToFarLine + vanishingPointY
  );
}

function initOnce() {
  const samplePolygon = getById("sample-polygon", SVGPolygonElement);
  const points = `${farLineX},${farLineTopY} ${farLineX},${farLineBottomY} ${nearLineX},${scaleToNearLine(
    farLineBottomY
  )} ${nearLineX},${scaleToNearLine(farLineTopY)}`;
  samplePolygon.setAttribute("points", points);
  const topLine = getById("top-fixed", SVGLineElement);
  topLine.y1.baseVal.value = scaleToLeftEdge(farLineTopY);
  const bottomLine = getById("bottom-fixed", SVGLineElement);
  bottomLine.y1.baseVal.value = scaleToLeftEdge(farLineBottomY);
  const farText = getById("far-text", SVGTextElement);
  const farYCenter = (farLineTopY + farLineBottomY) / 2;
  farText.style.setProperty("--center-y", `${farYCenter}px`);
  const nearText = getById("near-text", SVGTextElement);
  nearText.style.setProperty("--center-y", `${scaleToNearLine(farYCenter)}px`);
}
initOnce();

const measureToNear = getById("to-near", SVGLineElement);
const measureToFar = getById("to-far", SVGLineElement);

function setMeasurementAngle(farLineY: number) {
  const nearLineY = scaleToNearLine(farLineY);
  measureToFar.y1.baseVal.value = farLineY;
  measureToNear.y1.baseVal.value = nearLineY;
}

(window as any).setMeasurementAngle = setMeasurementAngle;

const random = Random.fromString("Random1");
const fixedYValues = initializedArray(20, () => random() * 4 + 0.5);
fixedYValues.push;
const pauseTime = 3000;
const moveTime = 250;
const timePerValue = pauseTime + moveTime;
let offset = 0;

function updateAnimation(timeInMS: DOMHighResTimeStamp) {
  const cycle = Math.floor(timeInMS / timePerValue);
  const initialY = fixedYValues[cycle % fixedYValues.length];
  const finalY = fixedYValues[(cycle + 1) % fixedYValues.length];
  const timeWithinCycle = timeInMS - cycle * timePerValue;
  const y =
    timeWithinCycle < moveTime
      ? lerp(initialY, finalY, timeWithinCycle / moveTime)
      : finalY;
  setMeasurementAngle(y);
}

const animationLoop = new AnimationLoop(updateAnimation);
