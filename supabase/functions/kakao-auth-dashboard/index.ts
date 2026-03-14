import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const KAKAO_REST_API_KEY = Deno.env.get('KAKAO_REST_API_KEY_DASHBOARD')!
const KAKAO_CLIENT_SECRET = Deno.env.get('KAKAO_CLIENT_SECRET_DASHBOARD')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const ALLOWED_ORIGINS = [
  'https://profile-dashborad.vercel.app',
  'http://localhost:3000',
]

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { code, redirect_uri } = await req.json()

    if (!code) {
      return new Response(JSON.stringify({ error: 'code is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 1) 카카오 access_token 교환
    const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: KAKAO_REST_API_KEY,
        client_secret: KAKAO_CLIENT_SECRET,
        redirect_uri,
        code,
      }),
    })

    const tokenData = await tokenRes.json()
    if (tokenData.error) {
      return new Response(JSON.stringify({ error: tokenData.error_description }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2) 카카오 프로필 조회
    const profileRes = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const profile = await profileRes.json()

    const kakaoId = String(profile.id)
    const nickname = profile.kakao_account?.profile?.nickname ?? profile.properties?.nickname ?? '사용자'
    const avatarUrl = profile.kakao_account?.profile?.profile_image_url ?? profile.properties?.profile_image ?? null

    // 3) Supabase admin으로 사용자 생성/로그인
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const kakaoEmail = `kakao_${kakaoId}@kakao.local`
    const userMeta = { kakao_id: kakaoId, full_name: nickname, avatar_url: avatarUrl, provider: 'kakao' }

    let user
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email: kakaoEmail,
      email_confirm: true,
      user_metadata: userMeta,
    })

    if (createError && createError.message.includes('already been registered')) {
      let page = 1
      while (!user) {
        const { data: { users } } = await supabase.auth.admin.listUsers({ page, perPage: 100 })
        if (!users || users.length === 0) break
        user = users.find((u: { email?: string }) => u.email === kakaoEmail)
        page++
      }
      if (user) {
        await supabase.auth.admin.updateUserById(user.id, { user_metadata: userMeta })
      }
    } else if (createError) {
      throw createError
    } else {
      void createData.user
    }

    // 4) 세션 생성
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: kakaoEmail,
    })
    if (linkError) throw linkError

    const linkUrl = new URL(linkData.properties.action_link)
    const token = linkUrl.searchParams.get('token')
    const type = linkUrl.searchParams.get('type') ?? 'magiclink'

    return new Response(
      JSON.stringify({ token, type, nickname, avatar_url: avatarUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
