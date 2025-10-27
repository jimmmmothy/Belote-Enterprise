export function Avatar({ name }: { name: string }) {
    return (
        <div className="avatar">
            {name ? name.charAt(0).toUpperCase() : "?"}
        </div>
    )
};