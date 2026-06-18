// SHA256_CERT_FINGERPRINT vem do pacote gerado pelo PWABuilder.
// Setar no Vercel: ANDROID_SHA256_FINGERPRINT=AB:CD:EF:...
export async function GET() {
  const fingerprint = process.env.ANDROID_SHA256_FINGERPRINT;

  if (!fingerprint) {
    return new Response(JSON.stringify([]), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const links = [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "com.metalab.anvisa",
        sha256_cert_fingerprints: [fingerprint],
      },
    },
  ];

  return new Response(JSON.stringify(links, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
