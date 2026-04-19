export function isMiniPay(): boolean {
  if (typeof window === "undefined") return false;

  const search = window.location.search;
  if (search && new URLSearchParams(search).get("minipay") === "1") {
    return true;
  }

  const eth = (window as unknown as { ethereum?: { isMiniPay?: boolean } })
    .ethereum;
  return Boolean(eth?.isMiniPay);
}
