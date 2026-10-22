type PlaceholderPageProps = {
  title: string
  description: string
}

function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <section className="card" aria-label={`${title} page`}>
      <div className="card-header">
        <h2>{title}</h2>
      </div>
      <div className="placeholder-body">
        <p>{description}</p>
      </div>
    </section>
  )
}

export default PlaceholderPage
