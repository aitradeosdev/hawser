"use client";

import { copy } from "@/lib/copy";
import { formatBytes } from "@/lib/format";
import type { ReceivedFile, SentFile } from "@/lib/types";

interface TransferListProps {
  received: ReceivedFile[];
  sent: SentFile[];
}

export function TransferList({ received, sent }: TransferListProps) {
  if (received.length === 0 && sent.length === 0) return null;
  return (
    <div className="manifest">
      {received.length > 0 && (
        <section
          className="manifest__section"
          aria-label={copy.manifest.ariaReceived}
        >
          <h2 className="manifest__heading">{copy.manifest.receivedHeading}</h2>
          <ul className="manifest__list">
            {received.map((file) => (
              <li key={file.id} className="manifest__row">
                <span className="manifest__name">{file.name}</span>
                <span className="manifest__meta">{formatBytes(file.size)}</span>
                <a
                  className="button button--line button--small"
                  href={file.url}
                  download={file.name}
                >
                  {copy.save}
                </a>
                {file.short && (
                  <p className="manifest__warning">
                    {copy.shortDelivery(file.name)}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      {sent.length > 0 && (
        <section
          className="manifest__section"
          aria-label={copy.manifest.ariaSent}
        >
          <h2 className="manifest__heading">{copy.manifest.sentHeading}</h2>
          <ul className="manifest__list">
            {sent.map((file) => (
              <li key={file.id} className="manifest__row">
                <span className="manifest__name">{file.name}</span>
                <span className="manifest__meta">{formatBytes(file.size)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
