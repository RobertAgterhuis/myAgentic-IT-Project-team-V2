Addendum — Microsoft Entra App Registration, Consent and Agent Workload Identity Model

Aanvulling op het bestaande mappingdocument voor de Microsoft-georiënteerde MCP-pluginarchitectuur. Datum: 20 maart 2026.

|                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Kernbesluit**: ja, voor Microsoft-integraties moet een expliciet identity- en consentmechanisme worden ingebouwd. De juiste implementatie is echter **niet** één willekeurige app registration voor het hele platform, en ook niet een nieuwe registratie per runtime-instance. De aanbevolen aanpak is: **één afzonderlijke workload identity per agentrol of privilege boundary**, met least-privilege API-permissies, expliciete tenantconsent, volledige auditability en centrale policy-validatie. |

# 1. Beoordeling

Ik ben het inhoudelijk eens met de richting. Omdat het platform Microsoft-georiënteerd is en agents acties kunnen uitvoeren tegen Microsoft Entra ID, Microsoft Graph, Azure Resource Manager, Azure DevOps en mogelijk SharePoint, Teams, OneDrive of Dataverse, moet identity een expliciet first-class ontwerpdeel zijn.

Microsoft maakt onderscheid tussen app registrations, application objects en service principals. Het application object is het globale appmodel; in een tenant wordt daar een service principal van aangemaakt die de feitelijke identiteit en verleende rechten in die tenant vertegenwoordigt. Daardoor moet jouw plugin niet alleen app registrations modelleren, maar ook tenantgebonden service principals, consentstatus en verleende permissies.

Ook het toestemmingsmodel moet expliciet zijn. In Microsoft Entra worden API-permissies pas bruikbaar nadat een gebruiker of beheerder daar consent voor heeft gegeven. Hogere of admin-restricted rechten vereisen tenantadmin-consent. Dat betekent dat jouw plugin een gecontroleerde onboarding- en consentflow moet hebben, niet alleen een technische configuratiepagina.

# 2. Waarom dit architectonisch noodzakelijk is

|                      |                                                                                                   |                                                                        |                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Ontwerpvraag         | Waarom relevant                                                                                   | Risico zonder mechanisme                                               | Aanbevolen richting                                                                        |
| Least privilege      | Microsoft Graph en andere Microsoft API’s publiceren zowel delegated als application permissions. | Te brede rechten op één platformidentity.                              | Per agentrol alleen de minimaal noodzakelijke rechten toekennen.                           |
| Consent              | Permissies worden pas effectief na user consent of admin consent.                                 | Agent denkt rechten te hebben die operationeel nog niet zijn verleend. | Consentstatus opnemen in runtime- en policy-evaluatie.                                     |
| Tenant isolation     | Service principals bestaan per tenant en rechten zijn tenant-specifiek.                           | Cross-tenant verwarring en onjuiste aannames.                          | Per tenant een eigen identity binding en statusmodellering.                                |
| Separation of duties | Niet elke agent mag dezelfde Microsoft-operaties uitvoeren.                                       | Orchestrator of Developer krijgt onnodig hoge rechten.                 | Werk met afzonderlijke identities per privilege boundary.                                  |
| Credential security  | Microsoft adviseert workload identity federation of certificaten boven client secrets.            | Secret leakage, rotatieproblemen en auditbeperkingen.                  | Federatie of certificaten standaardiseren; secrets alleen als gecontroleerde uitzondering. |

# 3. Ontwerpprincipe: per agentrol of privilege boundary, niet per runtime-instance

Het juiste granulariteitsniveau is niet één identity voor alles, maar ook niet een nieuwe app registration voor iedere losse agentsessie. De juiste eenheid is een duurzame agentrol of privilege boundary, bijvoorbeeld Infra Agent, DevOps Agent, Data Agent of Security Agent.

Daarmee blijven rechten begrijpelijk, auditbaar en onderhoudbaar. Je voorkomt een explosie van app registrations, terwijl je wel een strikte scheiding van bevoegdheden behoudt.

Voor agents die geen Microsoft-API’s hoeven aan te spreken, zoals een documentatieagent die uitsluitend in een repository of intern docs-systeem werkt, hoeft geen aparte Entra-app registratie te bestaan. Voor agents die wel Microsoft-resources aanroepen, is een eigen workload identity wel wenselijk.

## Aanbevolen granulariteit

|                    |                               |                                                                                 |                                                          |
| ------------------ | ----------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Agentrol           | Eigen app registration?       | Reden                                                                           | Opmerking                                                |
| Orchestrator Agent | Nee of zeer beperkt           | Plant en routeert; hoort geen brede uitvoerende rechten te hebben.              | Gebruik alleen read-only metadata waar echt nodig.       |
| Developer Agent    | Meestal nee voor tenant-API’s | Repo- en packagewerk is niet hetzelfde als tenantbeheer.                        | Laat platformacties via gespecialiseerde agents lopen.   |
| UI Agent           | Nee                           | Playwright en codewerk vereisen normaal geen Entra-app met hoge rechten.        | Alleen uitzonderen als M365-frontendintegratie nodig is. |
| DevOps Agent       | Ja                            | Kan pipelines, service connections en deployment-gerelateerde acties uitvoeren. | Beperk naar delivery-scope.                              |
| Infra Agent        | Ja                            | Azure-resources en platformacties vereisen duidelijke workload identity.        | Hoog risicoprofiel; strengste approvalregels.            |
| Security Agent     | Ja                            | Leest en beoordeelt tenant-, policy- en directorydata.                          | Primair read/propose, geen brede auto-remediation.       |
| Data Agent         | Ja                            | Datalaag en schema-acties vragen om eigen privilege boundary.                   | Destructieve data-acties altijd achter approval.         |

# 4. Toestemmingsmodel dat in de plugin moet worden ingebouwd

De plugin moet niet alleen registraties kunnen aanmaken, maar ook een expliciete consentprocedure afdwingen. Delegated permissions zijn bedoeld voor scenario’s met een aangemelde gebruiker; application permissions zijn bedoeld voor background services of daemons zonder gebruiker. Microsoft raadt bovendien aan om delegated en application permissions niet achteloos in één app te combineren wanneer een duidelijker scheidingsmodel mogelijk is.

Daarnaast zijn bepaalde rechten admin-restricted. Die mogen pas actief worden nadat een tenantbeheerder namens de organisatie consent heeft gegeven. Jouw runtime mag daarom een identity pas als ‘enabled’ beschouwen wanneer zowel registratie, service principal, vereiste API-permissies als consentstatus in orde zijn.

## Consent lifecycle

**•** De beheerder kiest welke agentrollen in de tenant beschikbaar mogen zijn.

**•** De plugin berekent per agentrol welke Microsoft-API-permissies nodig zijn.

**•** De plugin toont een consentpakket: app registration, service principal, permissies, reden, risico en impact.

**•** De gebruiker of tenantbeheerder verleent expliciet consent via een gecontroleerde flow.

**•** Pas na succesvolle validatie wordt de agentrol operationeel in de runtime gemount.

**•** Bij scopewijzigingen of nieuwe permissies moet opnieuw expliciete goedkeuring worden gevraagd.

# 5. Aanbevolen identitymodel voor een Microsoft-first platform

|                   |                                                      |                                                             |                                                    |                                                |
| ----------------- | ---------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------- |
| Onderdeel         | Aanbeveling                                          | Waarom                                                      | Niet doen                                          | Notitie                                        |
| App registration  | Per agentrol of privilege boundary                   | Scheidt bevoegdheden en audittrail                          | Eén monolithische app voor alle agents             | Hanteer vaste naamconventies en tagging        |
| Service principal | Per tenant automatisch of gecontroleerd aanmaken     | Rechten zijn tenant-specifiek                               | Aannemen dat registratie alleen voldoende is       | Service principal-status meenemen in runtime   |
| Permission type   | Delegated of application per scenario                | Juiste rechtentype per use case                             | Alles als application permission modelleren        | Interactie met gebruiker -> delegated          |
| Consent           | Expliciete UI-flow met admin/user consent            | Zonder consent geen geldige toegang                         | Implicit consent of verborgen installatie-effecten | Bewaar bewijs en timestamp                     |
| Credentials       | Managed identity, workload federation of certificaat | Microsoft adviseert federatie of certificaten boven secrets | Langlevende client secrets als standaard           | Secrets alleen als gecontroleerde uitzondering |

# 6. Gevolgen voor bootstrap, reconcile en runtime

Deze identitylaag moet in jouw bestaande bootstrap- en reconcilemodel worden opgenomen. De plugin moet identiteit daarom als code-defined desired state behandelen: welke agentrol bestaat, welke app registration daarbij hoort, welke API’s nodig zijn, welk toestemmingstype geldt, welke consentstatus is vereist en welke credentialvorm is toegestaan.

Daarom moeten extra commando’s en controles aan de CLI en runtime worden toegevoegd.

## Aanbevolen uitbreidingen op de command set

|                                       |                                                                                        |                                                                                |
| ------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Command                               | Doel                                                                                   | Resultaat                                                                      |
| npx my-plugin identity plan           | Berekent identity- en consentplan per agentrol                                         | Overzicht van vereiste app registrations, service principals en API-permissies |
| npx my-plugin identity bootstrap      | Maakt of registreert de benodigde identity-objecten                                    | Tenantgebonden identitybasis gereed, nog niet per se consented                 |
| npx my-plugin identity consent status | Valideert consent, permissies en credentialstatus                                      | Operational readiness per agentrol                                             |
| npx my-plugin reconcile               | Neemt identitystatus mee in desired-state synchronisatie                               | Alleen volledig geldige agents worden enabled                                  |
| npx my-plugin doctor                  | Controleert ontbrekende service principals, ontbrekende consent of onjuiste permissies | Heldere herstelacties voor beheerder                                           |

# 7. Runtime-evaluatie: wanneer is een agent echt enabled?

In het bestaande document is already vastgesteld dat een agent niet alleen cognitief, maar ook technisch en afdwingbaar aware moet zijn van welke MCP’s en tools enabled zijn. Voor Microsoft-integraties moet daar een identityvoorwaarde aan worden toegevoegd.

Een agentrol is pas werkelijk enabled wanneer registratie, tenantbinding, health, policy, approval en consent allemaal geldig zijn.

**Aanbevolen evaluatieregel:** effectiveEnabled = serverEnabled && agentPolicyAllows && toolPolicyAllows && environmentAllows && authReady && servicePrincipalReady && consentGranted && credentialPolicyValid && healthOk

Dit betekent dat een agent nooit alleen op basis van geconfigureerde metadata actief mag worden. Zolang consent of credentialvalidatie ontbreekt, moet de status bijvoorbeeld ‘AuthPending’, ‘ConsentPending’ of ‘BlockedByPolicy’ zijn in plaats van ‘Enabled’.

# 8. Gebruikerservaring en governance

Omdat toestemming expliciet moet zijn, hoort dit ook expliciet zichtbaar te zijn in de beheer-UI. De beheerder moet per agentrol kunnen zien welke Microsoft-identiteit wordt gebruikt, welke API’s worden aangeroepen, welke permissies gevraagd worden, of die delegated of application zijn, of admin consent nodig is en wanneer de laatste validatie heeft plaatsgevonden.

Daarnaast moet de plugin revocatie en herbeoordeling ondersteunen. Wanneer permissies veranderen, wanneer een certificaat verloopt, of wanneer een tenantbeheerder consent intrekt, moet de bijbehorende agentrol automatisch in een niet-operationele toestand komen.

## Aanbevolen beheerschermen

**•** Agent Identity Catalog — per agentrol de gekoppelde app registration, service principal en credentialvorm.

**•** Consent Center — alle gevraagde, verleende, geweigerde en verlopen consentrecords.

**•** Permission Diff — vergelijking tussen gewenste en feitelijke API-rechten.

**•** Credential Health — certificaatverval, federatie-instellingen of secret-uitzonderingen.

**•** Audit Trail — wie heeft welke identity geactiveerd, gewijzigd of ingetrokken.

# 9. Concrete ontwerpbeslissing voor opname in het hoofdontwerp

|               |                                                                                                                                                                           |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Onderwerp     | Definitieve ontwerpbeslissing                                                                                                                                             |
| Identitymodel | Voor Microsoft-integraties krijgt iedere agentrol of privilege boundary een eigen workload identitymodel met een eigen app registration of expliciet beheerde equivalent. |
| Consent       | Geen enkele Microsoft-API-integratie wordt operationeel zonder expliciete user consent of admin consent, afhankelijk van het rechtentype.                                 |
| Permissies    | Per agentrol worden alleen de minimaal noodzakelijke delegated of application permissions aangevraagd.                                                                    |
| Credentials   | Managed identities of workload identity federation hebben voorkeur; certificaten zijn tweede keuze; client secrets alleen als gecontroleerde uitzondering.                |
| Runtime       | Identitystatus is onderdeel van effectiveEnabled en van het agentmanifest.                                                                                                |
| Governance    | Elke wijziging in API-rechten, consentstatus of credentialstatus wordt geaudit en kan automatische blokkering veroorzaken.                                                |

# 10. Referenties

**•** Microsoft Entra — Overview of permissions and consent in the Microsoft identity platform.

**•** Microsoft Entra — Apps and service principals in Microsoft Entra ID.

**•** Microsoft Entra — Overview of user and admin consent.

**•** Microsoft Graph — Permissions reference.

**•** Microsoft Graph — Best practices for using Microsoft Graph permissions.

**•** Microsoft Entra — Configure user consent settings.

**•** Microsoft Entra / Graph — Register an application and create a service principal.

**•** Microsoft Entra Workload ID — Workload identity federation overview.

**•** Microsoft identity / Zero Trust — Use certificates or workload federation instead of client secrets where possible.
