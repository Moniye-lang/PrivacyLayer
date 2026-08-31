import { NextResponse } from 'next/server';
import { dictionaryStore } from '@/lib/engine/dictionary/dictionaryStore';
import { INDUSTRY_DOMAIN_PACKS, DomainPackId } from '@/lib/engine/dictionary/industryLexicons';
import { externalDictionaryConnector } from '@/lib/engine/dictionary/externalConnector';

export async function GET() {
  const enabledPacks = dictionaryStore.getEnabledDomainPacks();
  const activeTerms = dictionaryStore.getActiveDomainTerms();
  const externalConnectors = externalDictionaryConnector.getConnectors();

  const domainPacksSummary = Object.values(INDUSTRY_DOMAIN_PACKS).map((pack) => ({
    id: pack.id,
    name: pack.name,
    category: pack.category,
    description: pack.description,
    isEnabled: enabledPacks.includes(pack.id),
    termsCount: Object.keys(pack.terms).length,
    patternsCount: pack.patterns.length,
  }));

  return NextResponse.json({
    status: 'success',
    stats: {
      enabledDomainPacksCount: enabledPacks.length,
      totalActiveTermsCount: Object.keys(activeTerms).length,
      externalConnectorsCount: externalConnectors.length,
    },
    domainPacks: domainPacksSummary,
    externalConnectors,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, packId, enabled, terms, connectorConfig, connectorId } = body;

    if (action === 'toggle_domain_pack') {
      if (!packId || !(packId in INDUSTRY_DOMAIN_PACKS)) {
        return NextResponse.json({ error: 'Invalid packId' }, { status: 400 });
      }

      if (enabled) {
        dictionaryStore.enableDomainPack(packId as DomainPackId);
      } else {
        dictionaryStore.disableDomainPack(packId as DomainPackId);
      }

      return NextResponse.json({
        status: 'success',
        message: `Domain pack ${packId} ${enabled ? 'enabled' : 'disabled'}`,
        enabledPacks: dictionaryStore.getEnabledDomainPacks(),
      });
    }

    if (action === 'bulk_import') {
      if (!Array.isArray(terms)) {
        return NextResponse.json({ error: 'terms must be an array of { term, type } objects' }, { status: 400 });
      }

      let count = 0;
      for (const item of terms) {
        if (item && item.term) {
          dictionaryStore.addCustomTerm(item.term, item.type || 'CUSTOM_TERM');
          count++;
        }
      }

      return NextResponse.json({
        status: 'success',
        message: `Successfully imported ${count} custom terms into dictionary`,
        totalCustomTerms: dictionaryStore.getCustomTerms().length,
      });
    }

    if (action === 'add_external_connector') {
      if (!connectorConfig || !connectorConfig.id || !connectorConfig.url) {
        return NextResponse.json({ error: 'connectorConfig requires id and url' }, { status: 400 });
      }

      externalDictionaryConnector.registerConnector(connectorConfig);
      const syncResult = await externalDictionaryConnector.syncConnector(connectorConfig.id);

      return NextResponse.json({
        status: 'success',
        message: 'Registered external dictionary API connector',
        connector: connectorConfig,
        syncResult,
      });
    }

    if (action === 'sync_external_connector') {
      if (!connectorId) {
        return NextResponse.json({ error: 'connectorId required' }, { status: 400 });
      }

      const syncResult = await externalDictionaryConnector.syncConnector(connectorId);
      return NextResponse.json({
        status: syncResult.success ? 'success' : 'error',
        syncResult,
      });
    }

    return NextResponse.json({ error: 'Invalid action. Supported: toggle_domain_pack, bulk_import, add_external_connector, sync_external_connector' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error processing dictionary action' }, { status: 500 });
  }
}
