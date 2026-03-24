import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const pinataApiKey = process.env.PINATA_API_KEY;
    const pinataSecretApiKey = process.env.PINATA_SECRET_API_KEY;

    if (pinataApiKey && pinataSecretApiKey) {
      // Use real Pinata integration
      const pinataFormData = new FormData();
      pinataFormData.append("file", file);
      
      const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        headers: {
          pinata_api_key: pinataApiKey,
          pinata_secret_api_key: pinataSecretApiKey,
        },
        body: pinataFormData,
      });

      if (!res.ok) {
        throw new Error("Failed to upload to Pinata");
      }

      const resData = await res.json();
      return NextResponse.json({ ipfsHash: resData.IpfsHash });
      
    } else {
      // Mock integration for demo purposes when keys are not defined
      console.log("Mocking Pinata upload. Keys missing. Using valid fallback CID.");
      // Using the Bitcoin Whitepaper CID as a valid, permanent mock PDF file on IPFS
      const mockHash = `QmRA3NWM82ZGynMbYzAgYTSXCVM14Wx1RZ8fKP42G6gjgj`;
      
      // Artificial delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      return NextResponse.json({ ipfsHash: mockHash });
    }
    
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
