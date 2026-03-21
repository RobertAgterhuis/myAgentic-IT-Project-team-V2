import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type {
  PromptContractAssetsResponse,
  PromptContractAsset,
  QuestionnairesResponse,
  DecisionsResponse,
  PolicyListResponse,
} from '@/lib/api-types';

/** Aggregate prompt and contract assets from existing governance endpoints. */
export function usePromptContractAssets() {
  return useQuery({
    queryKey: queryKeys.promptsContracts.assets,
    queryFn: async (): Promise<PromptContractAssetsResponse> => {
      const [questionnaires, decisions, policies] = await Promise.all([
        apiGet<QuestionnairesResponse>('/questionnaires'),
        apiGet<DecisionsResponse>('/decisions'),
        apiGet<PolicyListResponse>('/v1/policies'),
      ]);

      const questionnaireAssets: PromptContractAsset[] = questionnaires.questionnaires.map((q) => {
        const openCount = q.questions.filter((question) => question.status !== 'ANSWERED').length;
        return {
          id: q.file,
          type: 'questionnaire',
          title: q.agent || q.file,
          scope: q.phase || 'unknown',
          governance_status:
            openCount === 0 ? 'compliant' : openCount <= 3 ? 'review' : 'attention',
          updated_at: q.generated,
        };
      });

      const decisionAssets: PromptContractAsset[] = decisions.open.map((d) => ({
        id: d.id,
        type: 'decision',
        title: d.question,
        scope: d.scope,
        governance_status: d.priority === 'HIGH' ? 'attention' : 'review',
        updated_at: d.date,
      }));

      const policyAssets: PromptContractAsset[] = policies.policies.map((policy) => ({
        id: policy.id,
        type: 'policy',
        title: policy.name,
        scope: policy.scope,
        governance_status: policy.severity === 'blocking' ? 'attention' : 'compliant',
      }));

      const assets = [...questionnaireAssets, ...decisionAssets, ...policyAssets];
      const compliant_assets = assets.filter(
        (asset) => asset.governance_status === 'compliant'
      ).length;
      const review_assets = assets.filter((asset) => asset.governance_status === 'review').length;
      const attention_assets = assets.filter(
        (asset) => asset.governance_status === 'attention'
      ).length;

      return {
        ok: true,
        generated_at: new Date().toISOString(),
        assets,
        summary: {
          total_assets: assets.length,
          compliant_assets,
          review_assets,
          attention_assets,
        },
      };
    },
    staleTime: 30_000,
  });
}
