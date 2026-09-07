import { prisma } from "@/lib/prisma";
import { CredentialForm, type CredentialProvider } from "@/components/settings/credential-form";

interface CredentialPageProps {
  userId: string;
  provider: CredentialProvider;
  title: string;
  description: string;
  secretLabel: string;
  secretPlaceholder: string;
  helpText: string;
  platformFallback: boolean;
}

/** Server wrapper that loads the stored (masked) credential metadata. */
export async function CredentialSettings(props: CredentialPageProps) {
  const credential = await prisma.integrationCredential.findUnique({
    where: { userId_provider: { userId: props.userId, provider: props.provider } },
    select: { label: true, metadata: true, lastVerifiedAt: true, isActive: true },
  });

  return (
    <CredentialForm
      provider={props.provider}
      title={props.title}
      description={props.description}
      secretLabel={props.secretLabel}
      secretPlaceholder={props.secretPlaceholder}
      helpText={props.helpText}
      configured={Boolean(credential?.isActive)}
      label={credential?.label ?? null}
      lastVerifiedAt={credential?.lastVerifiedAt ?? null}
      metadata={(credential?.metadata as Record<string, unknown> | null) ?? null}
      platformFallback={props.platformFallback}
    />
  );
}
