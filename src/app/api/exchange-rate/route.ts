import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await fetch(
      "https://api.exchangerate.host/latest?base=USD&symbols=PKR"
    );
    const data = await response.json();
    
    if (data.success && data.rates?.PKR) {
      return NextResponse.json({ rate: data.rates.PKR });
    }
    
    const fallbackRes = await fetch(
      "https://open.er-api.com/v6/latest/USD"
    );
    const fallbackData = await fallbackRes.json();
    
    if (fallbackData.rates?.PKR) {
      return NextResponse.json({ rate: fallbackData.rates.PKR });
    }
    
    return NextResponse.json({ rate: 285 }, { status: 200 });
  } catch (error) {
    console.error("Error fetching exchange rate:", error);
    return NextResponse.json({ rate: 285 }, { status: 200 });
  }
}
