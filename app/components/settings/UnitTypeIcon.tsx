import {
  CarFront,
  Truck,
} from "lucide-react";

type Props = {
  typeKey: string;
};

export function UnitTypeIcon({
  typeKey,
}: Props) {
  if (typeKey === "truck") {
    return <Truck />;
  }

  return <CarFront />;
}