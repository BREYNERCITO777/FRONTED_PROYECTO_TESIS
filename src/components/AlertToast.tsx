import React from "react";

type Props = {
  weapon_type: string;
  confidence: number;
};

export default function AlertToast({ weapon_type, confidence }: Props) {
  return (
    <div className="alert-toast">
      🚨 {weapon_type} ({confidence})
    </div>
  );
}
