import './ContentSections.css'

export default function ContentSections() {
    return (
        <div className="content-sections">
            {/* What is Synapse? */}
            <section className="section section-what-synapse">
                <div className="section-content-left">
                    <h2 className="section-title"><span className="title-prefix">What is<br /></span><span className="title-cursive">Synapse?</span></h2>
                    <div className="section-text">
                        <p>Synapse is the official annual technical festival of ZCOER — a platform where innovation, engineering, creativity, and student energy collide to create something far beyond a traditional college fest.</p>
                        <p>Built around the idea of connection, Synapse represents the spark that forms when minds, machines, and ideas link together. It is a celebration of technology in its purest and wildest form — where students don't just learn, they experiment, build, compete, collaborate, showcase, and lead.</p>
                        <p>Every edition of Synapse brings something new: fresh themes, modern technology, advanced workshops, technical events, design showcases, gaming arenas, cultural integration, and an environment that encourages students to push boundaries.</p>
                        <p>Synapse isn't just a fest — it's a movement, a culture, a growing ecosystem of young innovators shaping the future.</p>
                    </div>
                </div>
                <div className="section-image-right">
                    <div className="image-placeholder">
                        <span>Image: Synapse Innovation</span>
                    </div>
                </div>
            </section>

            {/* Why Synapse? */}
            <section className="section section-why-synapse">
                <div className="section-image-left">
                    <div className="image-placeholder">
                        <span>Image: Future Technology</span>
                    </div>
                </div>
                <div className="section-content-right">
                    <h2 className="section-title"><span className="title-prefix">Why<br /></span><span className="title-cursive">Synapse?</span></h2>
                    <div className="section-text">
                        <p>Synapse isn't just another technical festival — it's a gateway to the future.</p>
                        <p>Built on the idea of connection, creativity, and cutting-edge innovation, Synapse brings students face-to-face with the technologies shaping tomorrow. It's where ideas evolve into prototypes, skills sharpen into achievements, and passion transforms into real-world impact.</p>
                        <p>At Synapse, you don't just participate — you grow.</p>
                        <p>You explore advanced tech, join hands with students from different colleges, compete in challenges, attend workshops, discover new teams, build networks, and experience the energy of a community that thinks bigger.</p>
                        <p>Synapse exists to push boundaries — of knowledge, of imagination, and of what students can create when given the right platform.</p>
                        <p>It's more than a fest.<br />A spark.<br />A movement.<br />A culture of innovation that inspires every participant to think boldly, act fearlessly, and become a part of something larger than themselves.</p>
                        <p>Welcome to Synapse — the place where tomorrow begins.</p>
                    </div>
                </div>
            </section>

            {/* What is CCP? */}
            <section className="section section-what-ccp">
                <div className="section-content-diagonal">
                    <h2 className="section-title"><span className="title-prefix">What is<br /></span><span className="title-cursive">CCP?</span></h2>
                    <div className="section-text">
                        <p>The College Connect Program is an outreach initiative by Synapse '26 designed to build strong, meaningful connections with colleges across Pune and surrounding regions.</p>
                        <p>Its goal is simple: bring students from different institutes together under one collaborative, innovative, and inspiring platform.</p>
                        <p>Through this program, Synapse reaches out to other colleges, shares event information, invites participants, and creates opportunities for inter-college engagement.</p>
                        <p>It enables students from different campuses to register, compete, collaborate, volunteer, showcase projects, and become a part of the Synapse community.</p>
                        <p>This initiative strengthens networks, encourages knowledge exchange, and ensures that Synapse grows beyond the boundaries of ZCOER — becoming a true celebration of technology, creativity, and student talent across institutions.</p>
                    </div>
                </div>
                <div className="section-image-diagonal">
                    <div className="image-placeholder">
                        <span>Image: College Network</span>
                    </div>
                </div>
            </section>

            {/* Why CCP? */}
            <section className="section section-why-ccp">
                <div className="section-image-left-alt">
                    <div className="image-placeholder">
                        <span>Image: Collaboration</span>
                    </div>
                </div>
                <div className="section-content-right-alt">
                    <h2 className="section-title"><span className="title-prefix">Why<br /></span><span className="title-cursive">CCP?</span></h2>
                    <div className="section-text">
                        <p>The College Connect Program exists to open the doors of Synapse far beyond ZCOER.</p>
                        <p>It gives students from different colleges a chance to experience the energy, innovation, and opportunities that Synapse offers — while building a stronger, wider tech community.</p>
                        <div className="ccp-benefits">
                            <div className="benefit-item">expand participation</div>
                            <div className="benefit-item">discover talent across campuses</div>
                            <div className="benefit-item">share ideas and culture</div>
                            <div className="benefit-item">create inter-college collaboration</div>
                            <div className="benefit-item">and make Synapse a truly regional festival rather than a single-college event.</div>
                        </div>
                        <p>It's the bridge that brings multiple institutes together under one roof — making Synapse bigger, smarter, and more connected every year.</p>
                    </div>
                </div>
            </section>
        </div>
    )
}
