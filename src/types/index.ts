export type UserLevel = 'novato' | 'hincha' | 'guru' | 'chaman' | 'leyenda'
export type GroupType = 'friends' | 'office' | 'family' | 'community' | 'enterprise'
export type MatchStatus = 'upcoming' | 'live' | 'finished' | 'postponed'
export type MatchStage = 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'third' | 'final'
export type PowerUpEffect = 'double_points' | 'change_pick' | 'ai_pick' | 'anti_favorite' | 'rival_mufa'

export interface User {
  id: string
  phone?: string
  email?: string
  name: string
  alias?: string
  avatar_url?: string
  favorite_team?: string
  level: UserLevel
  xp: number
  created_at: string
}

export interface PrizeSplit {
  first:  number
  second: number
  third:  number
}

export interface Group {
  id: string
  slug: string
  name: string
  description?: string
  logo_url?: string
  owner_id: string
  type: GroupType
  is_premium: boolean
  is_public: boolean
  primary_color: string
  invite_code: string
  max_members: number
  prize_description?: string
  rules?: string
  entry_fee_clp?: number
  prize_split?: PrizeSplit
  predictions_close_at?: string
  created_at: string
}

export interface Match {
  id: string
  external_id?: string
  stage: MatchStage
  group_name?: string
  home_team: string
  away_team: string
  home_flag?: string
  away_flag?: string
  starts_at: string
  status: MatchStatus
  home_score?: number
  away_score?: number
  venue?: string
  had_red_card?: boolean
  had_var?: boolean
}

export interface Prediction {
  id: string
  match_id: string
  group_id: string
  user_id: string
  pred_home: number
  pred_away: number
  pred_red_card?: boolean
  pred_var?: boolean
  points_awarded: number
  is_locked: boolean
  mode: 'full' | 'spectator'
  created_at: string
}

export interface PowerUp {
  id: string
  name: string
  description: string
  effect: PowerUpEffect
  icon: string
  price_clp: number
  is_active: boolean
  created_at: string
}

export type UserPowerUpStatus = 'available' | 'used' | 'expired'

export interface UserPowerUp {
  id: string
  user_id: string
  group_id: string
  powerup_id: string
  status: UserPowerUpStatus
  prediction_id?: string
  used_at?: string
  expires_at?: string
  created_at: string
  powerup?: PowerUp
}

export interface GroupMember {
  group_id: string
  user_id: string
  role: 'admin' | 'member'
  points: number
  exact_hits: number
  winner_hits: number
  powerups_used: number
  streak_days: number
  position?: number
  user?: User
}