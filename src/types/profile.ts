export interface UserProject {
    name: string
    description: string
}

export interface UserProfile {
    name: string
    title: string
    bio: string
    stack: string[]
    experience: string
    projects: UserProject[]
    tjm: number | ""
    location: string
    availability: string
}

export const DEFAULT_PROFILE: UserProfile = {
    name: "",
    title: "",
    bio: "",
    stack: [],
    experience: "",
    projects: [],
    tjm: "",
    location: "",
    availability: "",
}

export const PROFILE_STORAGE_KEY = "profile"