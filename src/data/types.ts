export interface NavItem {
    name: string;
    avatar: string;
    description: string;
    url: string;
    category: string;
    id?: string;
    badge?: string;
    badgeIcon?: string;
    badgeColor?: string;
}

export interface NavCategory {
    title: string;
    icon: string;
    items: NavItem[];
}
