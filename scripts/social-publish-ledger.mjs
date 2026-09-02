import pg from 'pg';
const { Client } = pg;
const args = process.argv.slice(2);
const get = (k) => { const i=args.indexOf(`--${k}`); return i>=0 ? args[i+1] : undefined; };
const required = (k) => { const v=get(k); if(!v) throw new Error(`Missing --${k}`); return v; };
const platform=required('platform'), objectId=required('object-id'), objectType=required('object-type'), status=required('status');
const metadataRaw=get('metadata');
let metadata={}; if(metadataRaw) metadata=JSON.parse(metadataRaw);
const client=new Client({connectionString:process.env.DATABASE_URL});
await client.connect();
const q=`INSERT INTO social_publications
(publication,content_slug,platform,account_handle,account_id,object_id,object_type,status,permalink,asset_url,published_at,deleted_at,source_commit,metadata,updated_at)
VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,now())
ON CONFLICT(platform,object_id) DO UPDATE SET
content_slug=COALESCE(EXCLUDED.content_slug,social_publications.content_slug),
account_handle=COALESCE(EXCLUDED.account_handle,social_publications.account_handle),
account_id=COALESCE(EXCLUDED.account_id,social_publications.account_id),
object_type=EXCLUDED.object_type,status=EXCLUDED.status,
permalink=COALESCE(EXCLUDED.permalink,social_publications.permalink),
asset_url=COALESCE(EXCLUDED.asset_url,social_publications.asset_url),
published_at=COALESCE(EXCLUDED.published_at,social_publications.published_at),
deleted_at=COALESCE(EXCLUDED.deleted_at,social_publications.deleted_at),
source_commit=COALESCE(EXCLUDED.source_commit,social_publications.source_commit),
metadata=social_publications.metadata || EXCLUDED.metadata,
updated_at=now()
RETURNING id,platform,object_id,status,content_slug;`;
const deletedAt=get('deleted-at') || (status==='deleted' ? new Date().toISOString() : null);
const vals=[get('publication')||'business-future-today',get('slug')||null,platform,get('account')||null,get('account-id')||null,objectId,objectType,status,get('permalink')||null,get('asset-url')||null,get('published-at')||null,deletedAt,get('source-commit')||null,JSON.stringify(metadata)];
const r=await client.query(q,vals); console.log(JSON.stringify(r.rows[0])); await client.end();
